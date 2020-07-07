import * as ni from "./note-import";

test("sanitizeBody: strips markdown", () => {
  const input = ni.sanitizeBody(`# Lol`);
  const expected = `Lol`;
  expect(input).toEqual(expected);
});

test("sanitizeBody: strips out breadcrumbs", () => {
  const input = ni.sanitizeBody(`Lol<breadcrumb>test</breadcrumb>`);
  const expected = `Lol`;
  expect(input).toEqual(expected);
});
