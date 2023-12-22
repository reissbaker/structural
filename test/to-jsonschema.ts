import * as t from "..";

test("converts a whole bunch of types", () => {
  const Customer = t.subtype({
    orders: t.num,
    migrated: t.optional(t.bool),
  });
  const Business = t.subtype({
    users: t.array(Customer),
    orgChart: t.dict(t.str),
  });

  expect(t.toJSONSchema("business", Business)).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "business",
    type: "object",
    required: [ "users", "orgChart" ],
    properties: {
      orgChart: {
        type: "object",
        properties: {},
        additionalProperties: {
          type: "string",
        },
      },
      users: {
        type: "array",
        items: {
          type: "object",
          required: [ "orders" ],
          properties: {
            orders: { type: "number" },
            migrated: { type: "boolean" },
          },
        },
      },
    },
  });
});
