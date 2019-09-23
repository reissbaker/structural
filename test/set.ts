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

test("rejects non-sets", () => {
  const check = t.set(t.any);
  expect(() => {
    check.assert(null);
  }).toThrow();
});

test("toString", () => {
  expect(t.set(t.any).toString()).toEqual("Set<any>")
})
