import * as t from "..";

test("accepts empty maps", () => {
  const check = t.map(t.num, t.str);
  check.assert(new Map());
});

test("accepts maps where keys and values match checks", () => {
  const check = t.map(t.num, t.str);
  const map = new Map<number, string>();
  map.set(1, "hi");
  check.assert(map);
});

test("rejects maps where keys mismatch", () => {
  const check = t.map(t.num, t.str);
  const map = new Map<string, string>();
  map.set("foo", "bar");
  expect(() => {
    check.assert(map);
  }).toThrow();
});

test("rejects maps where values mismatch", () => {
  const check = t.map(t.num, t.str);
  const map = new Map<number, number>();
  map.set(0, 1);
  expect(() => {
    check.assert(map);
  }).toThrow();
});
