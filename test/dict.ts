import { expect, test } from "vitest";
import * as t from "../index";

test("converts to typescript", () => {
  expect(t.toTypescript(t.dict(t.str))).toEqual("{[key: string]: string}");
});

test("converts to JSON schema", () => {
  expect(t.toJSONSchema("dict", t.dict(t.str))).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "dict",
    type: "object",
    properties: {},
    additionalProperties: { type: "string" },
  });
});

test("converts to typescript with custom key name", () => {
  expect(t.toTypescript(t.dict(t.str).keyName("name"))).toEqual("{[name: string]: string}")
});

test("converts to multiline typescript if necessary", () => {
  expect(t.toTypescript(t.dict(t.exact({
    key: t.bool,
  })).keyName("k"))).toEqual("{\n  [k: string]: {\n    key: boolean,\n  }\n}");
});

test("accepts empty dictionaries", () => {
  const check = t.dict(t.str);
  check.assert({});
});

test("accepts dictionaries with matching values", () => {
  const check = t.dict(t.str.or(t.num));
  check.assert({
    hi: "test",
    world: 5,
  });
});

test("rejects dictionaries with non-matching values", () => {
  const check = t.dict(t.str);
  expect(() => {
    check.assert({
      world: 5,
    });
  }).toThrow();
});

test("checks properties named like Object prototype properties", () => {
  const check = t.dict(t.str);
  expect(() => {
    check.assert({ constructor: 5 });
  }).toThrow();
});

test("rejects non-objects", () => {
  const check = t.dict(t.any);
  expect(() => {
    check.assert(true);
  }).toThrow();
});

test("rejects null", () => {
  const check = t.dict(t.any);
  expect(() => {
    check.assert(null);
  }).toThrow();
});

test("rejects arrays", () => {
  const check = t.dict(t.any);
  expect(() => {
    check.assert([ ]);
  }).toThrow();
});

test("rejects non-dictionary object instances", () => {
  const check = t.dict(t.str);

  expect(() => {
    check.assert(new Date());
  }).toThrow();
});

test("slicing preserves properties named like Object prototype properties", () => {
  const check = t.dict(t.str);
  const input = { constructor: "value" };

  expect(check.slice(input)).toEqual(input);
});

test("slicing preserves __proto__ as data without changing the prototype", () => {
  const check = t.dict(t.str);
  const input = JSON.parse('{"__proto__":"value"}');
  const result = check.slice(input);

  expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(true);
  expect(result["__proto__"]).toBe("value");
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
});

test("sliced nested objects", () => {
  const nested = t.subtype({ id: t.str });
  const check = t.dict(nested);
  const dict: { [key: string]: any } = {};
  dict["hello"] = {
    id: "world",
    name: "blarg",
  };
  const result = check.slice(dict);
  const data: any = result["hello"];
  expect(data["id"]).toBe("world");
  expect(data["name"]).toBeUndefined();
});
