import * as t from "..";

class A {}
class B {}
const Wat: any = function(this: any, name: string): any {
this.name = name
}
delete Wat.name
Wat.prototype = {
  greet: function() {
    return "hello " + this.name
  }
}

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

test("toString", () => {
  expect(t.instanceOf(A).toString()).toEqual("A")
  expect(t.instanceOf(Wat).toString()).toEqual(`instanceof function (name) {
    this.name = name;
}`)
})
