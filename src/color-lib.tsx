export const isHexColor = (input: string): boolean =>
  /^#[0-9A-F]{6}$/i.test(input);

export const isRGBColor = (input: string): boolean =>
  /^rgb\( *[0-9]{1,3} *, *[0-9]{1,3} *, *[0-9]{1,3} *\)/.test(input);

export const isRGBAColor = (input: string): boolean =>
  /^rgba\( *[0-9]{1,3} *, *[0-9]{1,3} *, *[0-9]{1,3} *, *\d+(\.\d*)? *\)/.test(
    input
  );

export const isColor = (input: string): boolean =>
  isHexColor(input) || isRGBColor(input) || isRGBAColor(input);
