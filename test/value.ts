import * as t from "..";

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
