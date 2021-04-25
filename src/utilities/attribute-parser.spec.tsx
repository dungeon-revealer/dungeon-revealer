import { parseAttributes } from "./attribute-parser";

test.each([
  [
    `id="3"`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          location: { start: 0, end: 6 },
          value: {
            type: "stringAttributeValue",
            value: "3",
            location: { start: 4, end: 5 },
          },
        },
      ],
    ]),
  ],
  [
    `id='3'`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          location: { start: 0, end: 6 },
          value: {
            type: "stringAttributeValue",
            value: "3",
            location: { start: 4, end: 5 },
          },
        },
      ],
    ]),
  ],
  [
    `id= '3'`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          location: { start: 0, end: 7 },
          value: {
            type: "stringAttributeValue",
            value: "3",
            location: { start: 5, end: 6 },
          },
        },
      ],
    ]),
  ],
  [`id=a'3'`, new Map()],
  [
    `id=a'3' b="3"`,
    new Map([
      [
        "b",
        {
          type: "attribute",
          value: {
            type: "stringAttributeValue",
            value: "3",
            location: {
              start: 11,
              end: 12,
            },
          },
          location: { start: 8, end: 13 },
        },
      ],
    ]),
  ],
  [
    `id='3' var-lel="hi"`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          value: {
            type: "stringAttributeValue",
            value: "3",
            location: { start: 4, end: 5 },
          },
          location: {
            start: 0,
            end: 6,
          },
        },
      ],
      [
        "var-lel",
        {
          type: "attribute",
          value: {
            type: "stringAttributeValue",
            value: "hi",
            location: { start: 16, end: 18 },
          },
          location: {
            start: 7,
            end: 19,
          },
        },
      ],
    ]),
  ],
  [
    `id='3 var-lel="lol"`,
    new Map([
      [
        "var-lel",
        {
          type: "attribute",
          value: {
            type: "stringAttributeValue",
            value: "lol",
            location: { start: 15, end: 18 },
          },
          location: {
            start: 6,
            end: 19,
          },
        },
      ],
    ]),
  ],
  [
    `id={{}}`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          value: {
            type: "plainAttributeValue",
            value: "{}",
            location: { start: 4, end: 6 },
          },
          location: { start: 0, end: 7 },
        },
      ],
    ]),
  ],
  [
    `id={1}`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          value: {
            type: "plainAttributeValue",
            value: "1",
            location: { start: 4, end: 5 },
          },
          location: { start: 0, end: 6 },
        },
      ],
    ]),
  ],
  [
    `id={"1"}`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          value: {
            type: "plainAttributeValue",
            value: `"1"`,
            location: { start: 4, end: 7 },
          },
          location: { start: 0, end: 8 },
        },
      ],
    ]),
  ],
  [
    `id={{ "foo": "bars" }}`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          value: {
            type: "plainAttributeValue",
            value: `{ "foo": "bars" }`,
            location: { start: 4, end: 21 },
          },
          location: { start: 0, end: 22 },
        },
      ],
    ]),
  ],
  [
    `id={{ "foo": "bars" }} bars={{}}`,
    new Map([
      [
        "id",
        {
          type: "attribute",
          value: {
            type: "plainAttributeValue",
            value: `{ "foo": "bars" }`,
            location: { start: 4, end: 21 },
          },
          location: { start: 0, end: 22 },
        },
      ],
      [
        "bars",
        {
          type: "attribute",
          value: {
            type: "plainAttributeValue",
            value: `{}`,
            location: { start: 29, end: 31 },
          },
          location: { start: 23, end: 32 },
        },
      ],
    ]),
  ],
])("parseAttributes(`%s`) returns correct result", (input, expected) => {
  expect(parseAttributes(input)).toEqual(expected);
});

test("parseAttributes complex fixture", () => {
  const content = `<Template
  id="attackTemplate"
  var-score={{
    "label": "Axe Score",
    "value": 4
  }}
  var-mod={{
    "label": "Handicap",
    "value": 0,
    "min": -20,
    "max": 20
  }}
  var-roll="[1d20]"
  var-result="[{{roll}}]"
>`;
  expect(parseAttributes(content)).toMatchInlineSnapshot(`
    Map {
      "id" => Object {
        "location": Object {
          "end": 31,
          "start": 12,
        },
        "type": "attribute",
        "value": Object {
          "location": Object {
            "end": 30,
            "start": 16,
          },
          "type": "stringAttributeValue",
          "value": "attackTemplate",
        },
      },
      "var-score" => Object {
        "location": Object {
          "end": 92,
          "start": 34,
        },
        "type": "attribute",
        "value": Object {
          "location": Object {
            "end": 91,
            "start": 45,
          },
          "type": "plainAttributeValue",
          "value": "{
        \\"label\\": \\"Axe Score\\",
        \\"value\\": 4
      }",
        },
      },
      "var-mod" => Object {
        "location": Object {
          "end": 181,
          "start": 95,
        },
        "type": "attribute",
        "value": Object {
          "location": Object {
            "end": 180,
            "start": 104,
          },
          "type": "plainAttributeValue",
          "value": "{
        \\"label\\": \\"Handicap\\",
        \\"value\\": 0,
        \\"min\\": -20,
        \\"max\\": 20
      }",
        },
      },
      "var-roll" => Object {
        "location": Object {
          "end": 201,
          "start": 184,
        },
        "type": "attribute",
        "value": Object {
          "location": Object {
            "end": 200,
            "start": 194,
          },
          "type": "stringAttributeValue",
          "value": "[1d20]",
        },
      },
      "var-result" => Object {
        "location": Object {
          "end": 227,
          "start": 204,
        },
        "type": "attribute",
        "value": Object {
          "location": Object {
            "end": 226,
            "start": 216,
          },
          "type": "stringAttributeValue",
          "value": "[{{roll}}]",
        },
      },
    }
  `);
});
