import * as t from "..";

test("accepts anything", () => {
  t.any.assert(5);
  t.any.assert("five");
  t.any.assert({});
});

test("converts to typescript", () => {
  expect(t.toTypescript(t.any)).toEqual("any");
});
