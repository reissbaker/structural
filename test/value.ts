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

test("toString", () => {
  const check = t.value("foo").or(t.value("bar"))
  expect(check.toString()).toEqual(`"foo" | "bar"`)

  const check2 = t.value(new Map([[{}, 1]]))
  expect(check2.toString()).toEqual("=== [object Map]")
})
