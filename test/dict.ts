import * as t from "..";

test("converts to typescript", () => {
  expect(t.toTypescript(t.dict(t.str))).toEqual("{[key: string]: string}");
});

test("converts to typescript with custom key name", () => {
  expect(t.toTypescript(t.dict(t.str).keyName("name"))).toEqual("{[name: string]: string}")
});

test("converts to multiline typescript if necessary", () => {
  expect(t.toTypescript(t.dict(t.exact({
    key: t.bool,
  })))).toEqual("{\n  [key: string]: {\n    key: boolean,\n  }\n}");
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
