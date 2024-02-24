import * as t from "..";

test("converts to typescript", () => {
  expect(t.toTypescript(t.map(t.num, t.bool))).toEqual("Map<number, boolean>");
});

test("can't convert to JSON Schema", () => {
  expect(() => {
    t.toJSONSchema("bye", t.map(t.num, t.bool))
  }).toThrow();
});

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

test("rejects non-maps", () => {
  const check = t.map(t.any, t.any);
  expect(() => {
    check.assert(null);
  }).toThrow();
});

test("sliced nested objects", () => {
  const nested = t.subtype({ id: t.str });
  const check = t.map(t.str, nested);
  const map = new Map<string, t.GetType<typeof nested>>();
  map.set("hello", {
    id: "world",
    name: "blarg",
  } as t.GetType<typeof nested>);
  const result = check.slice(map);
  const data: any = result.get("hello");
  expect(data["name"]).toBeUndefined();
});
