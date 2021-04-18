import { withPlugins, random } from "@airjp73/dice-notation";
import { RollInformation } from "@airjp73/dice-notation/dist/roll";
import { DiceRule } from "@airjp73/dice-notation/dist/rules/types";

interface RollToken {
  numDice: number;
  numSides: number;
  numToDrop: number;
}

const generateRolls = (token: RollToken) => {
  const rolls: number[] = [];
  for (let i = 0; i < token.numDice; i++) {
    rolls.push(random(1, token.numSides));
  }
  return rolls;
};

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
      numToDrop: Math.max(0, token.numDice - token.numToDrop),
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
      numToDrop: Math.max(0, token.numDice - token.numToDrop),
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
  Array.from(getDroppedIndicesDropHighest(token, rolls)).reduce(
    (aggregate: number, index: number) => aggregate + rolls[index],
    0
  );

const calculateValueKeepingLowest = (
  token: RollToken,
  rolls: number[]
): number =>
  Array.from(
    getInvertedIndices(rolls, getDroppedIndicesKeepLowestN(token, rolls))
  ).reduce((aggregate: number, index: number) => aggregate + rolls[index], 0);

// Custom dice roll rule for format [XdY-L]
// (i.e. roll X dY's and drop the one lowest)
const rollRuleDropLowest: DiceRule<RollToken> = {
  regex: /\d+d\d+\-L/,
  typeConstant: "DropLowest",
  tokenize: (raw: string): RollToken => {
    return {
      numDice: parseInt(raw.split("d")[0]),
      numSides: parseInt(raw.split("-")[0].split("d")[1]),
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
      numSides: parseInt(raw.split("-")[0].split("d")[1]),
      numToDrop: 1,
    };
  },
  roll: generateRolls,
  calculateValue: calculateValueRemovingHighest,
};

// Common tokenization for Keep / Drop N rules
const tokenizeKeepDropN = (result: RegExpMatchArray | null) => {
  if (result) {
    return {
      numDice: parseInt(result[2]),
      numSides: parseInt(result[3]),
      numToDrop: parseInt(result[5]),
    };
  } else {
    throw new Error("Invalid raw data passed to tokenizer");
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
    tokenizeKeepDropN(raw.match(dropLowestN)),
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
    tokenizeKeepDropN(raw.match(dropHighestN)),
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
    tokenizeKeepDropN(raw.match(keepLowestN)),
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
    tokenizeKeepDropN(raw.match(keepHighestN)),
  roll: generateRolls,
  calculateValue: calculateValueKeepingHighest,
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

export type DiceRollResult = {
  result: number;
  detail: Array<DiceRollDetail>;
};

const formatRoll = (result: RollInformation): DiceRollResult => {
  return {
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
          token.detailType === "DropLowest" ||
          token.detailType === "DropLowestN" ||
          token.detailType === "DropHighest" ||
          token.detailType === "DropHighestN" ||
          token.detailType === "KeepLowestN" ||
          token.detailType === "KeepHighestN"
        ) {
          const rollResults = result.rolls[index] as number[];
          let crossedOutIndices: null | Set<number> = null;
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

          switch (token.detailType) {
            case "DropLowest":
            case "DropLowestN":
              crossedOutIndices = getDroppedIndicesDropLowest(
                token.detail,
                rollResults
              );
              break;
            case "DropHighest":
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
  };
};

// We map the result to our own representation
export const tryRoll = (input: string): DiceRollResult | null => {
  try {
    const result = roll(input);
    return formatRoll(result);
  } catch (err) {
    return null;
  }
};
