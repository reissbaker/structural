import * as t from "..";

test("converts a whole bunch of types", () => {
  const Customer = t.subtype({
    orders: t.num,
    migrated: t.optional(t.bool.comment("Are they migrated to the new system?")),
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
            migrated: {
              type: "boolean",
              description: "Are they migrated to the new system?",
            },
          },
        },
      },
    },
  });
});

test("exact structs emit closed object schemas", () => {
  expect(t.toJSONSchema("user", t.exact({
    name: t.str,
  }))).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "user",
    type: "object",
    required: [ "name" ],
    properties: {
      name: { type: "string" },
    },
    additionalProperties: false,
  });
});

test("subtype structs emit open object schemas", () => {
  expect(t.toJSONSchema("user", t.subtype({
    name: t.str,
  }))).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "user",
    type: "object",
    required: [ "name" ],
    properties: {
      name: { type: "string" },
    },
  });
});
