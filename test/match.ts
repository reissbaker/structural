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
    // strange:
    // :TSDoc on matcher shows this type:
    // const matcher: t.Switch<number, number, MapFn<number, number> | MapFn<5, number>>
    const matcher = t.when(t.num, (x: number) => x * x)
      .when(t.value(5 as 5), (x: 5) => x + 1)
      .when(t.str, x => x.length)
    // :TSDoc on t.match shows these types inferred:
    //  function match<string | number, number, MapFn<number, number> | MapFn<5, number>>(val: string | number, cases: t.Switch<string | number, number, MapFn<number, number> | MapFn<5, number>>): number
    // How can the cases: value be accept `matcher` if matcher has type
    // Switch<In=number, ...> but cases needs Switch<In=number|string, ...> ??
    //
    // matcher.run(x) also fails to compile... so why does t.match(x, matcher) work?
    // return matcher.run(x)
    return t.match(x, matcher)
  }
  handle('foo')
})
