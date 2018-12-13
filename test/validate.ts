import * as t from "..";

test("passes when the fn returns true", () => {
  const check = t.num.validate("between five and ten", (num) => {
    return num > 5 && num < 10;
  });

  check.assert(6);
});

test("fails when the fn returns false", () => {
  const check= t.num.validate("non-zero", num => num !== 0);
  expect(() => {
    check.assert(0);
  }).toThrow();
});

test("fails when the fn throws", () => {
  const check = t.num.validate("never", (_) => {
    throw new Error();
  });

  expect(check.check(0)).toBeInstanceOf(t.Err);
});
