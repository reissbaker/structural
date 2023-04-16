import * as t from "..";

class A {}
class B {}

test("converts to typescript", () => {
  expect(t.toTypescript(t.instanceOf(A))).toEqual("A");
});

test("throws an error on anon classes", () => {
  expect(() => {
    return t.toTypescript(t.instanceOf(class {}));
  }).toThrow();
});

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
