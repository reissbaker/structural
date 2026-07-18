import { expect, test } from "vitest";
import * as t from "../index";

test("converts to typescript if number", () => {
  expect(t.toTypescript(t.value(5))).toEqual("5");
});
test("converts to JSON Schema if number", () => {
  expect(t.toJSONSchema('const', t.value(5))).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "const",
    const: 5,
  });
});
test("converts to typescript if string", () => {
  expect(t.toTypescript(t.value("test"))).toEqual("\"test\"");
});
test("converts to typescript if null", () => {
  expect(t.toTypescript(t.value(null))).toEqual("null");
});
test("converts to typescript if undefined", () => {
  expect(t.toTypescript(t.value(undefined))).toEqual("undefined");
});
test("throws if non-convertible to typescript", () => {
  expect(() => {
    t.toTypescript(t.value(() => null));
  }).toThrow();
});

test("throws if NaN is converted to typescript", () => {
  expect(() => {
    t.toTypescript(t.value(NaN));
  }).toThrow();
});

test("throws if Infinity is converted to typescript", () => {
  expect(() => {
    t.toTypescript(t.value(Infinity));
  }).toThrow();
});

test("throws if not convertable to JSON Schema", () => {
  expect(() => {
    t.toJSONSchema("no", t.value(() => null));
  }).toThrow();
});

test("throws if NaN is converted to JSON Schema", () => {
  expect(() => {
    t.toJSONSchema("NaN", t.value(NaN));
  }).toThrow();
});

test("throws if Infinity is converted to JSON Schema", () => {
  expect(() => {
    t.toJSONSchema("Infinity", t.value(Infinity));
  }).toThrow();
});

test("throws if a lossy value is converted to JSON Schema", () => {
  expect(() => {
    t.toJSONSchema("date", t.value(new Date(0)));
  }).toThrow();
});

test("accepts values that match", () => {
  const check = t.value(5);
  check.assert(5);
});

test("accepts a matching NaN value", () => {
  const check = t.value(NaN);

  check.assert(NaN);
});

test("treats negative zero as the zero literal", () => {
  const check = t.value(-0);
  const zero: 0 = 0;

  check.assert(zero);
});

test("rejects non-matching values", () => {
  expect(() => {
    const check = t.value(5);
    check.assert(6);
  }).toThrow();
});
