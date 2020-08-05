import uuid from "uuid";
import { PubSub } from "graphql-subscriptions";
import { withPlugins } from "@airjp73/dice-notation";
import { DiceRule } from "@airjp73/dice-notation/dist/rules/types";
import { random } from "lodash";

type SharedResourceType =
  | { type: "NOTE"; id: string }
  | {
      type: "IMAGE";
      id: string;
    };

export type DiceRollDetail =
  | {
      type: "DiceRoll";
      content: string;
      detail: {
        max: number;
        min: number;
      };
      rolls: Array<number>;
    }
  | {
      type: "Constant";
      content: string;
    }
  | {
      type: "Operator";
      content: string;
    }
  | {
      type: "OpenParen";
      content: string;
    }
  | {
      type: "CloseParen";
      content: string;
    };

export type DiceRollResult = {
  result: number;
  detail: Array<DiceRollDetail>;
};

export type DiceTokenType = ReturnType<typeof roll>["tokens"][0];

export type ApplicationRecordSchema =
  | {
      type: "USER_MESSAGE";
      id: string;
      content: string;
      diceRolls: DiceRollResult[];
      authorName: string;
      createdAt: number;
    }
  | {
      type: "OPERATIONAL_MESSAGE";
      id: string;
      content: string;
      createdAt: number;
    }
  | {
      type: "SHARED_RESOURCE";
      id: string;
      resource: SharedResourceType;
      authorName: string;
      createdAt: number;
    };

// Custom dice roll token
interface RollToken {
  numDice: number;
  diceType: number;
  numToDrop: number;
}

const generateRolls = (token: RollToken) => {
  const rolls: number[] = [];
  for (let i = 0; i < token.numDice; i++) {
    rolls.push(random(1, token.diceType));
  }
  return rolls;
};

const calculateValueRemovingLowest = (
  token: RollToken,
  rolls: number[]
): number => {
  const usedRolls: number[] = [...rolls];

  // Less efficient that a sort followed by a splice with the number of dice to drop,
  // but more 'believable' because the rolled dice will remain in a random order in the
  // results.
  for (let i = 0; i < token.numToDrop; i++) {
    usedRolls.splice(usedRolls.indexOf(Math.min.apply(null, usedRolls)), 1);
  }

  return usedRolls.reduce((aggregate: number, current: number) => {
    return aggregate + current;
  }, 0);
};

const calculateVauleKeepingHighest = (
  token: RollToken,
  rolls: number[]
): number => {
  // Keeping the Highest rolls can be expressed in terms of Dropping the Lowest
  if (token.numToDrop <= token.numDice) {
    return calculateValueRemovingLowest(
      {
        numDice: token.numDice,
        diceType: token.diceType,
        numToDrop: token.numDice - token.numToDrop,
      },
      rolls
    );
  } else {
    throw "Cannot keep more dice than were rolled.";
  }
};

const calculateValueRemovingHighest = (
  token: RollToken,
  rolls: number[]
): number => {
  const usedRolls: number[] = [...rolls];

  // Less efficient that a sort followed by a splice with the number of dice to drop,
  // but more 'believable' because the rolled dice will remain in a random order in the
  // results.
  for (let i = 0; i < token.numToDrop; i++) {
    usedRolls.splice(usedRolls.indexOf(Math.max.apply(null, usedRolls)), 1);
  }

  return usedRolls.reduce((aggregate: number, current: number) => {
    return aggregate + current;
  }, 0);
};

const calculateValueKeepingLowest = (
  token: RollToken,
  rolls: number[]
): number => {
  // Keeping the Lowest rolls can be expressed in terms of Dropping the Highest
  if (token.numToDrop <= token.numDice) {
    return calculateValueRemovingHighest(
      {
        numDice: token.numDice,
        diceType: token.diceType,
        numToDrop: token.numDice - token.numToDrop,
      },
      rolls
    );
  } else {
    throw "Cannot keep more dice than were rolled.";
  }
};

// Custom dice roll rule for format [XdY-L]
// (i.e. roll X dY's and drop the one lowest)
const rollRuleDropLowest: DiceRule<RollToken> = {
  regex: /\d+d\d+\-L/,
  typeConstant: "DropLowest",
  tokenize: (raw: string): RollToken => {
    return {
      numDice: parseInt(raw.split("d")[0]),
      diceType: parseInt(raw.split("-")[0].split("d")[1]),
      numToDrop: 1,
    };
  },
  roll: generateRolls,
  calculateValue: calculateValueRemovingLowest,
};

// Custom dice roll rule for format [XdY-H]
// (i.e. roll X dY's and drop the one highest)
const rollRuleDropHighest: DiceRule<RollToken> = {
  regex: /\d+d\d+\-H/,
  typeConstant: "DropHighest",
  tokenize: (raw: string): RollToken => {
    return {
      numDice: parseInt(raw.split("d")[0]),
      diceType: parseInt(raw.split("-")[0].split("d")[1]),
      numToDrop: 1,
    };
  },
  roll: generateRolls,
  calculateValue: calculateValueRemovingHighest,
};

// Common tokenisation for Keep / Drop N rules
const tokeniseKeepDropN = (result: RegExpMatchArray | null) => {
  if (result) {
    return {
      numDice: parseInt(result[2]),
      diceType: parseInt(result[3]),
      numToDrop: parseInt(result[5]),
    };
  } else {
    throw "Invalid raw data passed to tokeniser";
  }
};

// Custom dice roll rule for formats [XdYdN] and [XdYdlN]
// (i.e. Roll X dY's, drop the lowest N)
const dropLowestN: RegExp = /((\d+)d(\d+))(d|dl)(\d+)/;
const detectDropLowestN: RegExp = /\d+d\d+d\d+|\d+d\d+dl\d+/;
const rollRuleDropLowestN: DiceRule<RollToken> = {
  regex: detectDropLowestN,
  typeConstant: "DropLowestN",
  tokenize: (raw: string): RollToken =>
    tokeniseKeepDropN(raw.match(dropLowestN)),
  roll: generateRolls,
  calculateValue: calculateValueRemovingLowest,
};

// Custom dice roll rule for format [XdYdhN]
// (i.e. Roll X dY's, drop the lowest N)
const dropHighestN: RegExp = /((\d+)d(\d+))(dh)(\d+)/;
const detectDropHighestN: RegExp = /\d+d\d+dh\d+/;
const rollRuleDropHighestN: DiceRule<RollToken> = {
  regex: detectDropHighestN,
  typeConstant: "DropHighestN",
  tokenize: (raw: string): RollToken =>
    tokeniseKeepDropN(raw.match(dropHighestN)),
  roll: generateRolls,
  calculateValue: calculateValueRemovingHighest,
};

// Custom dice roll rule for formats [XdYvN] and [XdYklN]
// (i.e. Roll X dY's, keep the lowest N)
const keepLowestN: RegExp = /((\d+)d(\d+))(v|kl)(\d+)/;
const detectKeepLowestN: RegExp = /\d+d\d+v\d+|\d+d\d+kl\d+/;
const rollRuleKeepLowestN: DiceRule<RollToken> = {
  regex: detectKeepLowestN,
  typeConstant: "KeepLowestN",
  tokenize: (raw: string): RollToken =>
    tokeniseKeepDropN(raw.match(keepLowestN)),
  roll: generateRolls,
  calculateValue: calculateValueKeepingLowest,
};

// Custom dice roll rule for formats [XdY^N], [XdYkN] and [XdYkhN]
// (i.e.Roll X dY's, keep the highest N)
const keepHighestN: RegExp = /((\d+)d(\d+))(\^|k|kh)(\d+)/;
const detectKeepHighestN: RegExp = /\d+d\d+\^\d+|\d+d\d+k\d+|\d+d\d+kh\d+/;
const rollRuleKeepHighestN: DiceRule<RollToken> = {
  regex: detectKeepHighestN,
  typeConstant: "KeepHighestN",
  tokenize: (raw: string): RollToken =>
    tokeniseKeepDropN(raw.match(keepHighestN)),
  roll: generateRolls,
  calculateValue: calculateVauleKeepingHighest,
};

// Configure defined roll rules
const rollRules: DiceRule<RollToken>[] = [
  rollRuleDropLowest,
  rollRuleDropLowestN,
  rollRuleDropHighest,
  rollRuleDropHighestN,
  rollRuleKeepLowestN,
  rollRuleKeepHighestN,
];
const { roll } = withPlugins(...rollRules);

// We map the result to our own representation
const tryRoll = (input: string): DiceRollResult | null => {
  try {
    const result = roll(input);
    return {
      result: result.result,
      detail: result.tokens.map((token, index) => {
        if (token.type === "DiceRoll") {
          if (token.detailType === "_SimpleDieRoll") {
            const rollResuls = result.rolls[index] as number[];
            return {
              type: "DiceRoll" as const,
              content: token.content,
              detail: {
                min: 1,
                max: token.detail.numSides as number,
              },
              rolls: rollResuls,
            };
          } else if (
            token.detailType === "DropLowest" ||
            token.detailType === "DropLowestN" ||
            token.detailType === "DropHighest" ||
            token.detailType === "DropHighestN" ||
            token.detailType === "KeepLowestN" ||
            token.detailType === "KeepHighestN"
          ) {
            const rollResuls = result.rolls[index] as number[];
            let diceType: string = "";
            switch (token.detailType) {
              case "DropLowest":
              case "DropHighest":
                diceType = token.content.split("-")[0];
                break;
              case "KeepLowestN":
              case "KeepHighestN":
                diceType = token.content
                  .split("k")[0]
                  .split("^")[0]
                  .split("v")[0];
                break;
              case "DropLowestN":
              case "DropHighestN":
                diceType = `${token.content.split("d")[0]}d${
                  token.content.split("d")[1]
                }`;
                break;
              default:
                diceType = token.content;
                break;
            }
            return {
              type: "DiceRoll" as const,
              content: diceType,
              detail: {
                min: 1,
                max: token.detail.numSides as number,
              },
              rolls: rollResuls,
            };
          } else if (token.detailType === "_Constant") {
            return {
              type: "Constant" as const,
              content: token.content,
            };
          }
          throw new Error("Invalid Type.");
        } else if (token.type === "Operator") {
          return {
            type: "Operator" as const,
            content: token.content,
          };
        } else if (token.type === "OpenParen") {
          return {
            type: "OpenParen" as const,
            content: token.content,
          };
        } else if (token.type === "CloseParen") {
          return {
            type: "CloseParen" as const,
            content: token.content,
          };
        }
        throw new Error("Invalid Type.");
      }),
    };
  } catch (err) {
    return null;
  }
};

const processRawContent = (
  message: string
): { content: string; diceRolls: DiceRollResult[] } => {
  const parts = message.split(/(\[[^\[]*\])/).filter(Boolean);

  const diceRolls: DiceRollResult[] = [];
  let diceRollIndex = 0;
  let content = "";

  for (const part of parts) {
    if (part.startsWith("[") && part.endsWith("]")) {
      const notation = part.slice(1, part.length - 1);
      const rollResult = tryRoll(notation);
      if (rollResult) {
        diceRolls.push(rollResult);
        content = content + `{${diceRollIndex}}`;
        diceRollIndex = diceRollIndex + 1;
        continue;
      }
      // in case the parsing fails we just return it as a basic text node
    }
    content = content + part;
  }

  return { content, diceRolls };
};

type NewMessagesPayload = {
  messages: Array<ApplicationRecordSchema>;
};

const MAXIMUM_CHAT_SIZE = 500;

export const createChat = () => {
  let state: Array<ApplicationRecordSchema> = [];
  const pubSub = new PubSub({});

  const addMessageToStack = (message: ApplicationRecordSchema) => {
    state.push(message);
    if (state.length > MAXIMUM_CHAT_SIZE) {
      state.shift();
    }

    pubSub.publish("NEW_MESSAGES", {
      messages: [message],
    } as NewMessagesPayload);
  };

  const addUserMessage = (args: { authorName: string; rawContent: string }) => {
    const { content, diceRolls } = processRawContent(args.rawContent);
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
      type: "USER_MESSAGE",
      createdAt: new Date().getTime(),
      ...args,
      content,
      diceRolls,
    };
    addMessageToStack(message);
  };

  const addSharedResourceMessage = (args: {
    authorName: string;
    resource: SharedResourceType;
  }) => {
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
      type: "SHARED_RESOURCE",
      createdAt: new Date().getTime(),
      ...args,
    };
    addMessageToStack(message);
  };

  const addOperationalMessage = (args: { content: string }) => {
    const message: ApplicationRecordSchema = {
      id: uuid.v4(),
      type: "OPERATIONAL_MESSAGE",
      createdAt: new Date().getTime(),
      content: args.content,
    };
    addMessageToStack(message);
  };

  return {
    addUserMessage,
    addSharedResourceMessage,
    addOperationalMessage,
    getMessages: () => state,
    subscribe: {
      newMessages: () =>
        pubSub.asyncIterator<NewMessagesPayload>("NEW_MESSAGES"),
    },
  };
};
