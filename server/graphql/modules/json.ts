import { t } from "..";
import { Kind, print, ValueNode, ObjectValueNode } from "graphql/language";

const identity = (value: JSON | any) => value;

const parseObject = (ast: ObjectValueNode) => {
  const value = Object.create(null);
  ast.fields.forEach((field) => {
    value[field.name.value] = parseLiteral(field.value);
  });

  return value;
};

const parseLiteral = (ast: ValueNode): any => {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      return parseObject(ast);
    case Kind.LIST:
      return ast.values.map((n) => parseLiteral(n));
    case Kind.NULL:
      return null;
    case Kind.VARIABLE:
      return undefined;
    default:
      throw new TypeError(`JSON cannot represent value: ${print(ast)}`);
  }
};

const GraphQLJSONScalar = t.scalarType({
  name: "JSON",
  description:
    "The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf).",
  serialize: identity,
  parseValue: identity,
  parseLiteral,
});

export const graphqlScalars = {
  JSON: GraphQLJSONScalar,
};
