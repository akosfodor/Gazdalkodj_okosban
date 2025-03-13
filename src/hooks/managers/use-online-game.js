import { FineAlert } from "@/Components/FineAlert";
import { WinnerAlert } from "@/Components/WinnerAlert";
import { PURCHASEABLE_ITEMS, SERVER_URL } from "@/lib/constants";
import { gameDataContext } from "@/lib/contexts";
import { FIELDS } from "@/lib/fields-config";
import {
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAlert } from "../use-alert";
import { useOnlinePlayer } from "../use-online-player";
import { usePopup } from "../use-popup";

/** @typedef {import("@/lib/types").GameManager} GameManager */
/** @typedef {import("@/lib/types").GameState} GameState */
/** @typedef {import("@/lib/types").Player} Player */
/** @typedef {import("@/lib/types").ShopItem} ShopItem */
/**
 * @template T
 * @typedef {import("@/lib/types").Result<T>} Result
 */
/**
 * @template [T=any]
 * @typedef {import("@/lib/types").WebSocketMessage<T>} WebSocketMessage
 */

/**
 * @param {string} id
 * @returns {GameManager}
 */
export function useOnlineGame(id) {
  const { openPopup, closePopup } = usePopup();
  const { showAlert } = useAlert();

  const { meta, setMeta, state, setState } = useContext(gameDataContext);
  const { player } = useOnlinePlayer();

  if (!meta || !state || !setMeta || !setState) {
    throw new Error("Game context not found or not initialized");
  }

  const ws = useRef(/** @type {WebSocket} */ (null));
  const [isMyTurn, setIsMyTurn] = useState(false);
  const isMyTurnRef = useRef(false);

  useEffect(() => {
    const value = state.players[state.currentPlayer].id === player?.id;
    setIsMyTurn(value);
    isMyTurnRef.current = value;
  }, [state, player]);

  useEffect(() => {
    ws.current = new WebSocket(
      `${SERVER_URL}/ws/game-${id}?playerID=${player.id}`
    );
    ws.current.onmessage = handleMessage;
    ws.current.onopen = () => {
      console.log("WebSocket is open");
    };
    ws.current.onclose = () => {
      console.log("WebSocket is closed");
    };

    return () => {
      ws.current.close();
    };
  }, []);

  useEffect(() => {
    if (state.winningPlayerIndex !== -1) {
      showAlert(createElement(WinnerAlert), { showCloseButton: false });
    }
  }, [state.winningPlayerIndex]);

  const updateState = useCallback(
    /**
     * @param {GameState | ((state: GameState) => GameState)} updater
     * @param {(state: GameState) => any} callback
     */
    (updater, callback = null) => {
      setState(updater, (newState) => {
        if (callback) {
          callback(newState);
        }
      });
    },
    [meta, setState]
  );

  const updateCurrentPlayer = useCallback(
    (
      /** @type {Player | ((player: Player) => Player)} */ playerOrUpdater,
      /** @type {(player: Player) => any} */ callback
    ) => {
      updateState(
        (prev) => {
          const currentPlayer = prev.players[prev.currentPlayer];
          const updatedPlayer =
            typeof playerOrUpdater === "function"
              ? playerOrUpdater(currentPlayer)
              : playerOrUpdater;

          return {
            ...prev,
            players: prev.players.map((p, index) =>
              index === prev.currentPlayer ? updatedPlayer : p
            ),
          };
        },
        (newState) => {
          if (callback) {
            callback(newState.players[newState.currentPlayer]);
          }
        }
      );
    },
    [updateState]
  );

  function closePopupEndAction() {
    closePopup();
    if (isMyTurnRef.current) {
      endActionCaller(state.currentPlayer);
      updateState((prev) => {
        prev.players[prev.currentPlayer].state = "actionEnded";
        return {
          ...prev,
        };
      });
    }
  }

  /**
   * @param {WebSocketMessage<GameState>} message
   */
  async function syncGameStateReceiver(message) {
    updateState(
      (prev) => {
        return {
          ...prev,
          ...message.data,
        };
      },
      (newState) => {
        if (
          newState.players[newState.currentPlayer].state === "actionStarted" ||
          newState.players[newState.currentPlayer].state === "rolledDice"
        ) {
          if (!isMyTurnRef.current) return;
          const field =
            FIELDS[newState.players[newState.currentPlayer].position];
          field?.action({
            currentPlayer: newState.players[newState.currentPlayer],
            updateCurrentPlayer,
            gameState: newState,
            updateGameState: updateState,
            playerIndex: newState.currentPlayer,
            openPopup,
          });
        }
      }
    );
  }

  /**
   * @param {number} playerIndex
   */
  async function rollDiceCaller(playerIndex) {
    sendMessage({
      type: "roll-dice",
      data: { playerIndex },
    });
    updateState((prev) => {
      prev.players[playerIndex].rollingDice = true;
      return {
        ...prev,
      };
    });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number}>} message
   */
  async function rollDiceStartedReceiver(message) {
    updateState((prev) => {
      prev.players[message.data.playerIndex].rollingDice = true;
      return {
        ...prev,
      };
    });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number, result: number}>} message
   */
  async function rollDiceReceiver(message) {
    updateState((prev) => {
      prev.players[message.data.playerIndex].rolledDice = message.data.result;
      return {
        ...prev,
      };
    });
  }

  /**
   * @param {number} playerIndex
   * @param {number} steps
   */
  async function movePlayerCaller(playerIndex, steps) {
    sendMessage({
      type: "move-player",
      data: { playerIndex, steps },
    });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number, steps: number}>} message
   */
  async function movePlayerReceiver(message) {
    const { playerIndex, steps } = message.data;

    const oldPlayer = state.players[playerIndex];

    if (state.players[playerIndex].inJail && steps !== 6) {
      updateState(
        (prevGameState) => {
          prevGameState.players[playerIndex].canRollDice = false;
          return {
            ...prevGameState,
          };
        },
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          if (isMyTurn) {
            showAlert(`Csak hatos dobással lehet kiszabadulni a börtönből!`);
          }
          updateState((prevGameState) => {
            prevGameState.players[playerIndex].state = "rolledDice";
            return {
              ...prevGameState,
            };
          });
        }
      );
      return;
    }

    const isStartingGame =
      oldPlayer.position === 0 &&
      oldPlayer.money === 400_000 &&
      oldPlayer.inventory.length === 0;

    updateState(
      (prevGameState) => {
        prevGameState.players[playerIndex].canRollDice = false;
        if (prevGameState.players[playerIndex].inJail) {
          if (steps === 6) {
            prevGameState.players[playerIndex].inJail = false;
            prevGameState.players[playerIndex].position = 9 + steps;
            return prevGameState;
          }
        } else {
          prevGameState.players[playerIndex].position =
            (prevGameState.players[playerIndex].position + steps) % 27;
          prevGameState.players[playerIndex].canEndTurn = false;
          prevGameState.players[playerIndex].state = "rolledDice";
        }

        return {
          ...prevGameState,
        };
      },
      (newGameState) => {
        const newField = FIELDS[newGameState.players[playerIndex].position];

        const crossedStart =
          oldPlayer.position > newGameState.players[playerIndex].position &&
          newGameState.players[playerIndex].position !== 0 &&
          !oldPlayer.inJail;

        updateState(
          (prevGameState) => {
            if (crossedStart && newField.id !== 0) {
              prevGameState.players[playerIndex].money += 150_000;
            }

            if (
              (crossedStart || oldPlayer.position === 0) &&
              !oldPlayer.inventory.includes("Ház") &&
              !isStartingGame
            ) {
              prevGameState.players[playerIndex].money -= 70_000;
            }

            return {
              ...prevGameState,
            };
          },
          async (_) => {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            updateState(
              (prevGameState) => ({
                ...prevGameState,
                players: prevGameState.players.map((player) => ({
                  ...player,
                  canEndTurn: true,
                })),
              }),
              () => {
                updateState(
                  (prev) => {
                    prev.players[playerIndex].state = newField.isActionInstant
                      ? "actionEnded"
                      : "actionStarted";
                    return {
                      ...prev,
                    };
                  },
                  (newState) => {
                    newField.action?.({
                      currentPlayer: newState.players[playerIndex],
                      updateCurrentPlayer: updateCurrentPlayer,
                      gameState: newState,
                      updateGameState: updateState,
                      playerIndex: playerIndex,
                      openPopup: (popupClass, content) => {
                        if (isMyTurnRef.current) {
                          openPopup(popupClass, content);
                        }
                      },
                    });
                  }
                );
              }
            );
            openPopup("", null);
            closePopup();
          }
        );
      }
    );
  }

  /**
   * @param {number} playerIndex
   */
  async function endActionCaller(playerIndex) {
    sendMessage({
      type: "end-action",
      data: { playerIndex },
    });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number}>} message
   */
  async function endActionReceiver(message) {
    const { playerIndex } = message.data;
    updateState((prev) => {
      prev.players[playerIndex].state = "actionEnded";
      return {
        ...prev,
      };
    });
  }

  /**
   * @param {number} playerIndex
   */
  async function endTurnCaller(playerIndex) {
    sendMessage({
      type: "end-turn",
      data: { playerIndex },
    });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number}>} message
   */
  async function endTurnReceiver(message) {
    const { playerIndex } = message.data;
    updateState((prev) => {
      prev.currentPlayer = (playerIndex + 1) % prev.players.length;
      prev.players[prev.currentPlayer].state = "justStarted";
      prev.players[prev.currentPlayer].canRollDice = true;
      prev.players[prev.currentPlayer].canEndTurn = false;
      prev.players[prev.currentPlayer].rollingDice = false;
      prev.players[prev.currentPlayer].rolledDice = null;

      if (prev.players[prev.currentPlayer].inHospital) {
        prev.players[prev.currentPlayer].canRollDice = false;
        prev.players[prev.currentPlayer].canEndTurn = true;
        prev.players[prev.currentPlayer].state = "actionEnded";
        prev.players[prev.currentPlayer].inHospital = false;
      }

      prev.winningPlayerIndex = prev.players.findIndex((player) => {
        const allItems = Object.values(PURCHASEABLE_ITEMS);
        return allItems
          .filter((item) => !item.optional)
          .every((item) => player.inventory.includes(item.id));
      });

      return {
        ...prev,
      };
    });
  }

  /**
   * @param {number} playerIndex
   * @param {ShopItem} item
   */
  async function buyItemCaller(playerIndex, item) {
    sendMessage({ type: "buy-item", data: { playerIndex, itemId: item.id } });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number, itemId: string}>} message
   */
  async function buyItemReceiver(message) {
    const { playerIndex, itemId } = message.data;
    updateState((prev) => {
      prev.players[playerIndex].money -= PURCHASEABLE_ITEMS[itemId].price;
      prev.players[playerIndex].inventory = [
        ...prev.players[playerIndex].inventory,
        itemId,
      ];
      return {
        ...prev,
      };
    });
  }

  /**
   * @param {number} playerIndex
   * @param {number} stop
   */
  async function buyTrainTicketCaller(playerIndex, stop) {
    sendMessage({ type: "buy-train-ticket", data: { playerIndex, stop } });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number, stop: number}>} message
   */
  async function buyTrainTicketReceiver(message) {
    const { playerIndex, stop } = message.data;
    updateState((prev) => {
      let moneyAdjustment = -3000;
      if (prev.players[playerIndex].position > stop) {
        moneyAdjustment += 150_000;
        if (!prev.players[playerIndex].inventory.includes("house")) {
          moneyAdjustment -= 70_000;
        }
      }
      prev.players[playerIndex].money += moneyAdjustment;
      prev.players[playerIndex].position = stop;
      return {
        ...prev,
      };
    });

    if (isMyTurnRef.current) {
      closePopupEndAction();
    }
  }

  /**
   * @param {number} playerIndex
   * @param {number} stop
   */
  async function freeRideTrainCaller(playerIndex, stop) {
    sendMessage({ type: "free-ride-train", data: { playerIndex, stop } });
  }

  /**
   * @param {WebSocketMessage<{playerIndex: number, stop: number, fined: boolean}>} message
   */
  async function freeRideTrainReceiver(message) {
    const { playerIndex, stop, fined } = message.data;
    updateState((prev) => {
      let moneyAdjustment = 0;
      if (fined) {
        moneyAdjustment = -40_000;
        if (isMyTurnRef.current) {
          showAlert(
            createElement(FineAlert, { name: prev.players[playerIndex].name })
          );
        }
      }
      if (prev.players[playerIndex].position > stop) {
        moneyAdjustment += 150_000;
        if (!prev.players[playerIndex].inventory.includes("house")) {
          moneyAdjustment -= 70_000;
        }
      }
      prev.players[playerIndex].money += moneyAdjustment;
      prev.players[playerIndex].position = stop;
      return {
        ...prev,
      };
    });

    if (isMyTurnRef.current) {
      closePopupEndAction();
    }
  }

  const sendMessage = useCallback(
    /**
     * @param {WebSocketMessage} message
     */
    (message) => {
      ws.current.send(JSON.stringify(message));
    },
    [ws]
  );

  const handleMessage = useCallback(
    /**
     * @param {MessageEvent} wsMessage
     */
    (wsMessage) => {
      const message = JSON.parse(wsMessage.data);
      console.log("message", message);

      switch (message.type) {
        case "sync-game-state":
          syncGameStateReceiver(message);
          break;
        case "roll-dice-started":
          rollDiceStartedReceiver(message);
          break;
        case "roll-dice-result":
          rollDiceReceiver(message);
          break;
        case "move-player-result":
          movePlayerReceiver(message);
          break;
        case "action-ended":
          endActionReceiver(message);
          break;
        case "end-turn-result":
          endTurnReceiver(message);
          break;
        case "buy-item-result":
          buyItemReceiver(message);
          break;
        case "buy-train-ticket-result":
          buyTrainTicketReceiver(message);
          break;
        case "free-ride-train-result":
          freeRideTrainReceiver(message);
          break;
      }
    },
    [updateState]
  );

  return {
    meta,
    state,
    currentPlayer: state.players[state.currentPlayer],
    isMyTurn,
    isMyTurnRef,

    closePopup: closePopupEndAction,

    updateMeta: setMeta,
    updateState,
    updateCurrentPlayer,

    rollDice: rollDiceCaller,
    movePlayer: movePlayerCaller,
    endTurn: endTurnCaller,

    buyItem: buyItemCaller,
    buyTrainTicket: buyTrainTicketCaller,
    freeRideTrain: freeRideTrainCaller,
  };
}
