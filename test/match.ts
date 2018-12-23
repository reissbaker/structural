import * as t from ".."

describe(t.CaseSwitch, () => {
  test("cannot construct with zero cases", () => {
    expect(() => {
      new t.CaseSwitch([])
    }).toThrow()
  })

  test("type acceptance is memoized", () => {
    const matcher = t.when(t.str, () => 'str')
                     .when(t.num, () => 'num')
    expect(matcher.accept).toBe(matcher.accept)
  })
})

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

test("exhaustiveness example with t.Kind", () => {
  const fn = (u: t.Kind) => t.match(u,
      t.when(t.instanceOf(t.Any), () => 'any')
       .when(t.instanceOf(t.Never), () => 'never')
       .when(t.instanceOf(t.SetType), () => 'set')
       .when(t.instanceOf(t.MapType), () => 'map')
       .when(t.instanceOf(t.Dict), () => 'dict')
       .when(t.instanceOf(t.Struct), () => 'struct')
       .when(t.instanceOf(t.Arr), () => 'array')
       .when(t.instanceOf(t.Value), () => 'value')
       .when(t.instanceOf(t.InstanceOf), () => 'instanceof')
       .when(t.instanceOf(t.TypeOf), () => 'typeof')
       .when(t.instanceOf(t.Either), () => 'either')
       .when(t.instanceOf(t.Intersect), () => 'intersect')
       .when(t.instanceOf(t.Validation), () => 'validation')
       .when(t.instanceOf(t.Is), () => 'is'))

  expect(fn(t.any)).toBe('any')
  expect(fn(t.value(1).or(t.value('two')))).toBe('either')
})

test("kind example", () => {
  // This example demonstrates that
  function visitTypes(type: t.Kind, pre: (x: t.Kind) => void, post: (x: t.Kind) => void) {
    const recur = (x: t.Kind) => visitTypes(x, pre, post)
    const ignore = (_: t.Kind) => {}
    pre(type)
    t.match(
      type,
      t.when(t.instanceOf(t.Any), ignore)
       .when(t.instanceOf(t.Never), ignore)
       .when(t.instanceOf(t.SetType), v => recur(v.valueType))
       .when(t.instanceOf(t.MapType), v => { recur(v.keyType); recur(v.valueType) })
       .when(t.instanceOf(t.Dict), v => recur(v.valueType))
       .when(t.instanceOf(t.Struct), v =>
         Object.keys(v.definition).forEach(k => recur(v.definition[k])))
       .when(t.instanceOf(t.Arr), v => recur(v.elementType))
       .when(t.instanceOf(t.Value), ignore)
       .when(t.instanceOf(t.InstanceOf), ignore)
       .when(t.instanceOf(t.TypeOf), ignore)
       .when(t.instanceOf(t.Either), v => { recur(v.l); recur(v.r) })
       .when(t.instanceOf(t.Intersect), v => { recur(v.left); recur(v.r) })
       .when(t.instanceOf(t.Validation), ignore)
       .when(t.instanceOf(t.Is), ignore)
    )
    post(type)
  }

  function logType(type: t.Kind) {
    const pre = (v: t.Kind) => {
      console.group()
      console.log((v.constructor as any).name)
    }
    const post = (_: t.Kind) => { console.groupEnd() }
    visitTypes(type, pre, post)
  }

  logType(t.subtype({
    foo: t.num,
    bar: t.num,
    baz: t.subtype({
      wat: t.bool,
      cow: t.value('wat')
    }).or(t.subtype({
      wat: t.str,
      cow: t.value('str')
    }))
  }))
})
