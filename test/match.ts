import * as t from ".."

test("returns value", () => {
  expect(
    t.match(
      5, t.when(t.str, x => `hello ${x}`)
          .when(t.num, x => x * 2))
  ).toBe(10)
})

test("enforces exhaustive match", () => {
  const handle = (x: number | string) => {
    const matcher = t
      .when(t.value(5 as 5), (x: 5) => x + 1)
      .when(t.num, (x: number) => x * x)
      // Try commenting out this arm: compilation will fail if you do
      .when(t.str, x => x.length)
    return t.match(x, matcher)
  }
  expect(handle('foo')).toBe(3)
  expect(handle(5)).toBe(6)
  expect(handle(2)).toBe(4)
})

test("throws a type error if none match", () => {
  class Animal {}
  class Dog extends Animal {}
  class Cat extends Animal {}
  const matcher = t.when(t.str, x => `hello ${x}`)
                   .when(t.instanceOf(Dog), _ => 'dog')
                   .when(t.instanceOf(Animal), _ => 'animal')

  expect(t.match(new Dog(), matcher)).toBe('dog')
  expect(t.match(new Cat(), matcher)).toBe('animal')
  expect(t.match(new Animal(), matcher)).toBe('animal')

  expect(() => {
    t.match(5 as any, matcher)
  }).toThrow();
})
