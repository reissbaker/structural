import * as t from "..";

class A {}
class B {}

test("accepts values that are an instance of the class", () => {
  const check = t.instanceOf(A);
  check.assert(new A());
});

test("rejects values that are not an instance of the class", () => {
  const check = t.instanceOf(A);
  expect(() => {
    check.assert(new B());
  }).toThrow();
});
