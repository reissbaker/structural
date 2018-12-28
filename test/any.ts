import * as t from "..";

test("accepts anything", () => {
  t.any.assert(5);
  t.any.assert("five");
  t.any.assert({});
});

test("toString", () => {
  expect(t.any.toString()).toEqual("any")
})
