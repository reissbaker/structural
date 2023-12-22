import * as t from "..";

test("converts to typescript", () => {
  expect(t.toTypescript(t.never)).toEqual("never");
});

test("can't convert to JSON schema by default", () => {
  expect(() => {
    t.toJSONSchema("huh", t.never);
  }).toThrow();
});

test("converts to JSON Schema if errorOnNever is false", () => {
  expect(t.toJSONSchema("huh", t.never, {
    errorOnNever: false,
  })).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "huh",
    allOf: [ { type: "string" }, { type: "number" } ],
  });
});

// what a test.
test("accepts nothing", () => {
  expect(() => {
    t.never.assert(5);
  }).toThrow();
  expect(() => {
    t.never.assert("five");
  }).toThrow();
  expect(() => {
    t.never.assert({});
  }).toThrow();
});
