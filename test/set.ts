import { expect, test } from "vitest";
import * as t from "../index";

test("converts to typescript", () => {
  expect(t.toTypescript(t.set(t.num))).toEqual("Set<number>");
});

test("can't convert to JSON Schema", () => {
  expect(() => {
    t.toJSONSchema("no", t.set(t.num));
  }).toThrow();
});

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

test("sliced nested objects", () => {
  const nested = t.subtype({ id: t.str });
  const check = t.set(nested);
  const set = new Set<t.GetType<typeof nested>>();
  set.add({
    id: "world",
    name: "blarg",
  } as t.GetType<typeof nested>);
  const result = check.slice(set);
  const data: any = Array.from(result)[0];
  expect(data["name"]).toBeUndefined();
});

test("nested slicing returns the property value that passed validation", () => {
  const check = t.set(t.subtype({ id: t.str }));
  let reads = 0;
  const value = Object.defineProperty({}, "id", {
    enumerable: true,
    get() {
      reads += 1;
      return reads === 1 ? "valid" : 5;
    },
  });

  expect(Array.from(check.slice(new Set([ value ])))).toEqual([{ id: "valid" }]);
  expect(reads).toBe(1);
});
