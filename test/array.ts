import * as t from "..";

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
