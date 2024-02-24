import * as t from "..";

test("converts to typescript", () => {
  expect(t.toTypescript(t.array(t.bool))).toEqual("Array<boolean>");
});

test("converts to JSONSchema", () => {
  expect(t.toJSONSchema("arr<bool>", t.array(t.bool))).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "arr<bool>",
    type: "array",
    items: { type: "boolean" },
  });
});

test("accepts the empty array", () => {
  const check = t.array(t.num);
  check.assert([]);
});

test("accepts arrays where all elements match the check given", () => {
  const check = t.array(t.num.or(t.str));
  check.assert([ 1, 2, "hello" ]);
});

test("rejects arrays where there are non-matching elements", () => {
  const check = t.array(t.num.or(t.str));
  expect(() => {
    check.assert([ 1, 2, false ]);
  }).toThrow();
});

test("rejects non-arrays", () => {
  const check = t.array(t.any);
  expect(() => {
    check.assert(null);
  }).toThrow();
});

test("sliced nested objects", () => {
  const check = t.array(t.subtype({
    id: t.str,
  }));
  const result = check.slice([
    { id: "hello", name: "world" }
  ]);
  const data: any = result[0];
  expect(data["name"]).toBeUndefined();
});
