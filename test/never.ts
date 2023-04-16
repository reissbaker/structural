import * as t from "..";

test("converts to typescript", () => {
  expect(t.toTypescript(t.never)).toEqual("never");
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
