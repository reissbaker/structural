import * as t from "..";

test("converts to typescript if number", () => {
  expect(t.toTypescript(t.value(5))).toEqual("5");
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
test("throws if non-convertible", () => {
  expect(() => {
    t.toTypescript(t.value(() => null));
  }).toThrow();
});

test("accepts values that match", () => {
  const check = t.value(5);
  check.assert(5);
});

test("rejects non-matching values", () => {
  expect(() => {
    const check = t.value(5);
    check.assert(6);
  }).toThrow();
});
