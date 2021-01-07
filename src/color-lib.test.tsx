import * as lib from "./color-lib";

it.each([
  ["#fefefe", true],
  ["red", false],
])("isHexColor: given input '%p' returns '%p'", () => {
  expect(lib.isHexColor("red")).toEqual(false);
});

it.each([
  ["rgb(255, 255, 255)", true],
  ["rgb( 255,255 , 255)", true],
  ["asd", false],
])("isRGBColor: given input '%p' returns '%p'", (color, expected) => {
  expect(lib.isRGBColor(color)).toEqual(expected);
});

it.each([
  ["rgba(255, 255, 255, 1)", true],
  ["rgba( 255, 12 , 1,0.1 )", true],
  ["asd", false],
])("isRGBAColor: given input '%p' returns '%p'", (color, expected) => {
  expect(lib.isRGBAColor(color)).toEqual(expected);
});
