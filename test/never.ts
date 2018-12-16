import * as t from "..";

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
