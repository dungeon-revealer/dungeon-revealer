import {
  getDroppedIndicesDropLowest,
  getDroppedIndicesDropHighest,
  getDroppedIndicesKeepLowestN,
  getDroppedIndicesKeepHighestN,
} from "./roll-dice";

test.each([
  [[2, 1, 3], 2, new Set([0, 1])],
  [[3, 2, 1], 1, new Set([2])],
  [[10, 20, 30, 40], 3, new Set([0, 1, 2])],
  [[1, 1, 1, 1], 3, new Set([1, 2, 3])],
])(
  "getDroppedIndicesDropLowest for %s, drop %d = %s",
  (rolls, numToDrop, expectedIndices) => {
    const indices = getDroppedIndicesDropLowest(
      { numDice: rolls.length, numToDrop, numSides: 6 },
      rolls
    );
    expect(indices).toEqual(expectedIndices);
  }
);

test.each([
  [[2, 1, 3], 2, new Set([0, 2])],
  [[3, 2, 1], 1, new Set([0])],
  [[10, 20, 30, 40], 3, new Set([1, 2, 3])],
  [[10, 20, 30, 40], 5, new Set([0, 1, 2, 3])],
])(
  "getDroppedIndicesDropHighest for %s, drop %d = %s",
  (rolls, numToDrop, expectedIndices) => {
    const indices = getDroppedIndicesDropHighest(
      { numDice: rolls.length, numToDrop, numSides: 6 },
      rolls
    );
    expect(indices).toEqual(expectedIndices);
  }
);

test.each([
  [[2, 1, 3], 2, new Set([0, 2])],
  [[3, 2, 1], 1, new Set([0])],
  [[10, 20, 30, 40], 3, new Set([1, 2, 3])],
  [[10, 20, 30, 40], 5, new Set([0, 1, 2, 3])],
])(
  "getDroppedIndicesKeepLowestN for %s, keep %d = %s",
  (rolls, numToDrop, expectedIndices) => {
    const indices = getDroppedIndicesKeepLowestN(
      { numDice: rolls.length, numToDrop, numSides: 6 },
      rolls
    );
    expect(indices).toEqual(expectedIndices);
  }
);

test.each([
  [[2, 1, 3], 2, new Set([0, 1])],
  [[3, 2, 1], 1, new Set([2])],
  [[10, 20, 30, 40], 3, new Set([0, 1, 2])],
  [[10, 20, 30, 40], 5, new Set([0, 1, 2, 3])],
])(
  "getDroppedIndicesKeepHighestN for %s, keep %d = %s",
  (rolls, numToDrop, expectedIndices) => {
    const indices = getDroppedIndicesKeepHighestN(
      { numDice: rolls.length, numToDrop, numSides: 6 },
      rolls
    );
    expect(indices).toEqual(expectedIndices);
  }
);
