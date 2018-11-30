import * as t from "..";

test("accepts values that match", () => {
  const check = t.set(t.num);
  const set = new Set<number>();
  set.add(1);
  check.assert(set);
});

test("accepts empty sets", () => {
  const check = t.set(t.num);
  const set = new Set<number>();
  check.assert(set);
});

test("rejects sets with non-matching values", () => {
  const check = t.set(t.num);
  const set = new Set<string>();
  set.add("hi");
  expect(() => {
    check.assert(set);
  }).toThrow();
});
