import { withPlugins, createDiceRoller } from "@airjp73/dice-notation";
import type { Random, DiceRule } from "@airjp73/dice-notation";
import type { RollInformation } from "@airjp73/dice-notation/dist/roll";
import times from "lodash/times";

interface RollToken {
  numDice: number;
  numSides: number;
  numToDrop: number;
}

const generateRolls = (token: RollToken, { random }: { random: Random }) =>
  times(token.numDice, () => random(1, token.numSides));

const getInvertedIndices = (
  items: Array<unknown>,
  indices: Set<number>
): Set<number> => {
  const invertedIndices = new Set<number>();
  items.forEach((_, index) => {
    if (!indices.has(index)) {
      invertedIndices.add(index);
    }
  });
  return invertedIndices;
};

export const getDroppedIndicesDropLowest = (
  token: RollToken,
  rolls: Array<number>
): Set<number> => {
  const lowestIndices = new Set<number>();
  const rollCopy = rolls.slice();
  const droppedValues: Array<number> = [];

  for (let counter = 0; counter < token.numToDrop; counter++) {
    if (rollCopy.length === 0) {
      break;
    }
    const index = rollCopy.indexOf(Math.min(...rollCopy));
    droppedValues.push(rollCopy[index]);
    rollCopy.splice(index, 1);
  }

  const valueIndexLookupMap = new Map<number, Array<number>>();
  for (const [value, index] of rolls.entries()) {
    let indices = valueIndexLookupMap.get(index);
    if (!indices) {
      indices = [];
      valueIndexLookupMap.set(index, indices);
    }
    indices.push(value);
  }

  for (const droppedValue of droppedValues) {
    lowestIndices.add(valueIndexLookupMap.get(droppedValue)!.pop()!);
  }

  return lowestIndices;
};

export const getDroppedIndicesDropHighest = (
  token: RollToken,
  rolls: Array<number>
): Set<number> => {
  const lowestIndices = getDroppedIndicesDropLowest(
    {
      ...token,
      numToDrop: Math.max(0, token.numDice - token.numToDrop),
    },
    rolls
  );
  return getInvertedIndices(rolls, lowestIndices);
};

export const getDroppedIndicesKeepHighestN = (
  token: RollToken,
  rolls: Array<number>
) =>
  getDroppedIndicesDropLowest(
    {
      ...token,
      numToDrop: token.numToDrop,
    },
    rolls
  );

export const getDroppedIndicesKeepLowestN = (
  token: RollToken,
  rolls: Array<number>
) =>
  getDroppedIndicesDropHighest(
    {
      ...token,
      numToDrop: token.numToDrop,
    },
    rolls
  );

const calculateValueRemovingLowest = (
  token: RollToken,
  rolls: number[]
): number =>
  Array.from(
    getInvertedIndices(rolls, getDroppedIndicesDropLowest(token, rolls))
  ).reduce((aggregate: number, index: number) => aggregate + rolls[index], 0);

const calculateValueKeepingHighest = (
  token: RollToken,
  rolls: number[]
): number =>
  Array.from(
    getInvertedIndices(rolls, getDroppedIndicesKeepHighestN(token, rolls))
  ).reduce((aggregate: number, index: number) => aggregate + rolls[index], 0);

const calculateValueRemovingHighest = (
  token: RollToken,
  rolls: number[]
): number =>
  Array.from(
    getInvertedIndices(rolls, getDroppedIndicesDropHighest(token, rolls))
  ).reduce((aggregate: number, index: number) => aggregate + rolls[index], 0);

const calculateValueKeepingLowest = (
  token: RollToken,
  rolls: number[]
): number =>
  Array.from(
    getInvertedIndices(rolls, getDroppedIndicesKeepLowestN(token, rolls))
  ).reduce((aggregate: number, index: number) => aggregate + rolls[index], 0);

// Custom dice roll rule for format [XdYdl] and [XdYdlN]
// Roll XdY drop lowest N = 1
const dropLowestN: RegExp = /((\d+)d(\d+))dl(?:(\d+))?/;
const detectDropLowestN: RegExp = /\d+d\d+dl(?:\d+)?/;
const rollRuleDropLowestN: DiceRule<RollToken> = {
  regex: detectDropLowestN,
  typeConstant: "DropLowestN",
  tokenize: (raw: string): RollToken => {
    const result = raw.match(dropLowestN);
    if (!result) {
      throw new Error("Error while parsing.");
    }
    const [, , numDiceRaw, numSidesRaw, numToDropRaw = "1"] = result;
    return {
      numDice: parseInt(numDiceRaw, 10),
      numSides: parseInt(numSidesRaw, 10),
      numToDrop: parseInt(numToDropRaw, 10),
    };
  },
  roll: generateRolls,
  calculateValue: calculateValueRemovingLowest,
};

// Custom dice roll rule for format [XdYdh] [XdYdhN]
// Roll XdY drop highest N = 1
const dropHighestN: RegExp = /((\d+)d(\d+))dh(?:(\d+))?/;
const detectDropHighestN: RegExp = /\d+d\d+dh(?:\d+)?/;
const rollRuleDropHighestN: DiceRule<RollToken> = {
  regex: detectDropHighestN,
  typeConstant: "DropHighestN",
  tokenize: (raw: string): RollToken => {
    const result = raw.match(dropHighestN);
    if (!result) {
      throw new Error("Error while parsing.");
    }
    const [, , numDiceRaw, numSidesRaw, numToDropRaw = "1"] = result;
    return {
      numDice: parseInt(numDiceRaw, 10),
      numSides: parseInt(numSidesRaw, 10),
      numToDrop: parseInt(numToDropRaw, 10),
    };
  },
  roll: generateRolls,
  calculateValue: calculateValueRemovingHighest,
};

// Custom dice roll rule for format[XdYkl] [XdYklN]
// Roll XdY keep lowest N = 1
const keepLowestN: RegExp = /((\d+)d(\d+))kl(?:(\d+))?/;
const detectKeepLowestN: RegExp = /\d+d\d+kl(?:\d+)?/;
const rollRuleKeepLowestN: DiceRule<RollToken> = {
  regex: detectKeepLowestN,
  typeConstant: "KeepLowestN",
  tokenize: (raw: string): RollToken => {
    const result = raw.match(keepLowestN);
    if (!result) {
      throw new Error("Error while parsing.");
    }
    const [, , numDiceRaw, numSidesRaw, numToKeepRaw = "1"] = result;
    const numDice = parseInt(numDiceRaw, 10);
    const numToKeep = parseInt(numToKeepRaw, 10);
    return {
      numDice,
      numSides: parseInt(numSidesRaw, 10),
      numToDrop: Math.max(0, numDice - numToKeep),
    };
  },
  roll: generateRolls,
  calculateValue: calculateValueKeepingLowest,
};

// Custom dice roll rule for format [XdYkh] or [XdYkhN]
// Roll XdY keep highest N = 1
const keepHighestN: RegExp = /((\d+)d(\d+))kh(?:(\d+))?/;
const detectKeepHighestN: RegExp = /\d+d\d+kh(?:\d+)?/;
const rollRuleKeepHighestN: DiceRule<RollToken> = {
  regex: detectKeepHighestN,
  typeConstant: "KeepHighestN",
  tokenize: (raw: string): RollToken => {
    const result = raw.match(keepHighestN);
    if (!result) {
      throw new Error("Error while parsing.");
    }
    const [, , numDiceRaw, numSidesRaw, numToKeepRaw = "1"] = result;
    const numDice = parseInt(numDiceRaw, 10);
    const numToKeep = parseInt(numToKeepRaw, 10);
    return {
      numDice,
      numSides: parseInt(numSidesRaw, 10),
      numToDrop: Math.max(0, numDice - numToKeep),
    };
  },
  roll: generateRolls,
  calculateValue: calculateValueKeepingHighest,
};

// Configure defined roll rules
const rollRules: DiceRule<RollToken>[] = [
  rollRuleDropLowestN,
  rollRuleDropHighestN,
  rollRuleKeepLowestN,
  rollRuleKeepHighestN,
];

const { roll } = createDiceRoller(withPlugins(...rollRules));

export type DiceRollDetail =
  | {
      type: "DiceRoll";
      content: string;
      detail: {
        max: number;
        min: number;
      };
      rolls: Array<{ value: number; crossedOut: boolean }>;
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

const isDiceRollResultSymbol = Symbol("isDiceRollResult");

export type DiceRollResult = {
  id: string;
  [isDiceRollResultSymbol]: true;
  result: number;
  detail: Array<DiceRollDetail>;
};

export const isDiceRollResult = (obj: unknown): obj is DiceRollResult =>
  typeof obj === "object" && obj != null && isDiceRollResultSymbol in obj;

const formatRoll = (result: RollInformation, id: string): DiceRollResult => {
  return Object.freeze({
    [isDiceRollResultSymbol]: true,
    id,
    result: result.result,
    detail: result.tokens.map((token, index) => {
      if (token.type === "DiceRoll") {
        if (token.detailType === "_SimpleDieRoll") {
          const rollResults = result.rolls[index] as number[];
          return {
            type: "DiceRoll" as const,
            content: token.content,
            detail: {
              min: 1,
              max: token.detail.numSides as number,
            },
            rolls: rollResults.map((value) => ({ value, crossedOut: false })),
          };
        } else if (
          token.detailType === "DropLowestN" ||
          token.detailType === "DropHighestN" ||
          token.detailType === "KeepLowestN" ||
          token.detailType === "KeepHighestN"
        ) {
          const rollResults = result.rolls[index] as number[];
          let crossedOutIndices: null | Set<number> = null;
          const diceType: string = `${token.detail.numDice}d${token.detail.numSides}`;

          switch (token.detailType) {
            case "DropLowestN":
              crossedOutIndices = getDroppedIndicesDropLowest(
                token.detail,
                rollResults
              );
              break;
            case "DropHighestN":
              crossedOutIndices = getDroppedIndicesDropHighest(
                token.detail,
                rollResults
              );
              break;
            case "KeepHighestN":
              crossedOutIndices = getDroppedIndicesKeepHighestN(
                token.detail,
                rollResults
              );
              break;
            case "KeepLowestN":
              crossedOutIndices = getDroppedIndicesKeepLowestN(
                token.detail,
                rollResults
              );
              break;
          }

          return {
            type: "DiceRoll" as const,
            content: diceType,
            detail: {
              min: 1,
              max: token.detail.numSides as number,
            },
            rolls: rollResults.map((value, index) => ({
              value,
              crossedOut: crossedOutIndices?.has(index) ?? false,
            })),
          };
        } else if (token.detailType === "_Constant") {
          return {
            type: "Constant" as const,
            content: token.content,
          };
        }
        throw new Error(`Invalid Detail Type '${token.detailType}'.`);
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
      // @ts-ignore
      throw new Error(`Invalid Type '${token.type}'.`);
    }),
  });
};

// We map the result to our own representation
export const tryRoll = (input: string) => {
  try {
    const result = roll(input);
    return (id: string) => formatRoll(result, id);
  } catch (err) {
    // TODO: Better error handling :/
    return null;
  }
};
