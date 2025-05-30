import { BankRobbery } from "@/Components/field-popups/BankRobbery";
import { Bobthebuilder } from "@/Components/field-popups/Bobthebuilder";
import { Carshop } from "@/Components/field-popups/Carshop";
import { Casino } from "@/Components/field-popups/Casino";
import { Elza } from "@/Components/field-popups/Elza";
import { ElzaAndIdea } from "@/Components/field-popups/ElzaAndIdea";
import { Idea } from "@/Components/field-popups/Idea";
import { Insurance } from "@/Components/field-popups/Insurance";
import { Lucky } from "@/Components/field-popups/Lucky";
import { Steelroad } from "@/Components/field-popups/Steelroad";
import { Yappel } from "@/Components/field-popups/Yappel";

/** @type {import("@/lib/types").Field[]} */
export const FIELDS = [
  {
    id: 0,
    name: "Start",
    x: 92.45,
    y: 83,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) =>
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].money += 170_000;
        return {
          ...prevGameState,
        };
      }),
  },

  {
    id: 1,
    name: "Lucky 1",
    x: 73.7,
    y: 84,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("lucky", <Lucky />),
  },
  {
    id: 2,
    name: "Trash",
    x: 65.4,
    y: 84,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) =>
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].money -= 1500;
        return {
          ...prevGameState,
        };
      }),
  },
  {
    id: 3,
    name: "Elza",
    x: 57.1,
    y: 84,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("elza", <Elza />),
  },
  {
    id: 4,
    name: "South Station",
    x: 48.9,
    y: 84,
    isStop: true,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("steelroad", <Steelroad />),
  },
  {
    id: 5,
    name: "Bank Robbery",
    x: 40.6,
    y: 84,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("bankrobbery", <BankRobbery />),
  },
  {
    id: 6,
    name: "Elza and Idea",
    x: 32.5,
    y: 84,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("elzaandidea", <ElzaAndIdea />),
  },
  {
    id: 7,
    name: "Lucky 2",
    x: 24.2,
    y: 84,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("lucky", <Lucky />),
  },
  {
    id: 8,
    name: "Smoking",
    x: 16,
    y: 84,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) =>
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].money -= 1500;
        return {
          ...prevGameState,
        };
      }),
  },

  { id: 9, name: "Jail (visiting)", x: 1.25, y: 91.5 },

  {
    id: 10,
    name: "Movie Theater",
    x: 5,
    y: 64,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) =>
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].money -= 5000;
        return {
          ...prevGameState,
        };
      }),
  },
  {
    id: 11,
    name: "West Station",
    x: 5,
    y: 45,
    isStop: true,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("steelroad", <Steelroad />),
  },
  {
    id: 12,
    name: "Casino",
    x: 5,
    y: 26.5,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("casino", <Casino />),
  },

  {
    id: 13,
    name: "Airport",
    x: 5,
    y: 10,
    isActionInstant: false,
    action: async (props) => {
      props.updateGameState(
        (prevGameState) => {
          prevGameState.players[props.playerIndex].position += 4;
          return {
            ...prevGameState,
          };
        },
        async (newGameState) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const newField =
            FIELDS[newGameState.players[props.playerIndex].position];
          props.updateGameState(
            (prev) => {
              prev.players[props.playerIndex].state = newField.isActionInstant
                ? "actionEnded"
                : "actionStarted";
              return {
                ...prev,
              };
            },
            (newState) => {
              newField.action?.({
                ...props,
                currentPlayer: newState.players[props.playerIndex],
                gameState: newState,
              });
            }
          );
        }
      );
    },
  },

  {
    id: 14,
    name: "Bob the Builder",
    x: 16,
    y: 7.5,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("bobthebuilder", <Bobthebuilder />),
  },
  {
    id: 15,
    name: "Car Shop",
    x: 24.2,
    y: 7.5,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("carshop", <Carshop />),
  },
  {
    id: 16,
    name: "Car travel",
    x: 32.5,
    y: 7.5,
    isActionInstant: false,
    action: async (props) => {
      if (
        props.gameState.players[props.playerIndex].inventory.includes("car")
      ) {
        props.updateGameState(
          (prevGameState) => {
            prevGameState.players[props.playerIndex].position += 10;
            return {
              ...prevGameState,
            };
          },
          async (newGameState) => {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const newField =
              FIELDS[newGameState.players[props.playerIndex].position];
            props.updateGameState(
              (prev) => {
                prev.players[props.playerIndex].state = newField.isActionInstant
                  ? "actionEnded"
                  : "actionStarted";
                return {
                  ...prev,
                };
              },
              (newState) => {
                newField.action?.({
                  ...props,
                  currentPlayer: newState.players[props.playerIndex],
                  gameState: newState,
                });
              }
            );
          }
        );
      }
    },
  },
  {
    id: 17,
    name: "Lucky 3",
    x: 40.6,
    y: 7.5,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("lucky", <Lucky />),
  },
  {
    id: 18,
    name: "North Station",
    x: 48.9,
    y: 7.5,
    isStop: true,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("steelroad", <Steelroad />),
  },
  {
    id: 19,
    name: "Abidas",
    x: 57.1,
    y: 7.5,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) =>
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].money -= 15_000;
        return {
          ...prevGameState,
        };
      }),
  },
  {
    id: 20,
    name: "Idea",
    x: 65.4,
    y: 7.5,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("idea", <Idea />),
  },
  {
    id: 21,
    name: "Yappel",
    x: 73.7,
    y: 7.5,
    action: ({ openPopup }) => openPopup("yappel", <Yappel />),
  },
  {
    id: 22,
    name: "ABC",
    x: 81.8,
    y: 7.5,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) =>
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].money -= 10_000;
        return {
          ...prevGameState,
        };
      }),
  },
  {
    id: 23,
    name: "Hospital",
    x: 94,
    y: 11,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) => {
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].inHospital = true;
        prevGameState.players[playerIndex].canRollDice = false;
        return {
          ...prevGameState,
        };
      });
    },
  },
  {
    id: 24,
    name: "Insurance",
    x: 93,
    y: 26,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("insurance", <Insurance />),
  },
  {
    id: 25,
    name: "East Station",
    x: 93,
    y: 45,
    isStop: true,
    isActionInstant: false,
    action: ({ openPopup }) => openPopup("steelroad", <Steelroad />),
  },
  {
    id: 26,
    name: "Roll again",
    x: 93,
    y: 64,
    isActionInstant: true,
    action: ({ updateGameState, playerIndex }) =>
      updateGameState((prevGameState) => {
        prevGameState.players[playerIndex].canRollDice = true;
        prevGameState.players[playerIndex].rollingDice = false;
        prevGameState.players[playerIndex].rolledDice = null;
        return {
          ...prevGameState,
        };
      }),
  },

  { id: 27, name: "Jail (locked up)", x: 5, y: 84 },
];
