import { expect, test } from "vitest";
import { JSON_SCHEMA_VERSION, t, toJSONSchema, toTypescript } from "../index";

type SchemaContainer<T> = {
  schema: t.Type<T>;
};

function renderSchema<T>({ schema }: SchemaContainer<T>) {
  return {
    jsonSchema: toJSONSchema("Schema", schema),
    typescript: toTypescript(schema),
  };
}

test("converters accept schemas whose concrete kind was erased to Type", () => {
  const rendered = renderSchema({
    schema: t.subtype({
      name: t.str,
    }),
  });

  expect(rendered.typescript).toBe("{\n  name: string,\n}");
  expect(rendered.jsonSchema).toEqual({
    $schema: JSON_SCHEMA_VERSION,
    title: "Schema",
    type: "object",
    required: [ "name" ],
    properties: {
      name: { type: "string" },
    },
  });
});
