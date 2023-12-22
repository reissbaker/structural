import * as t from "..";

test("converts to typescript", () => {
  expect(t.toTypescript(
    t.is("string", (val: any): val is string => typeof val === "string")
  )).toEqual("string");
});

test("can't convert to JSON Schema", () => {
  expect(() => {
    t.toJSONSchema("bye", t.is("something", (val: any): val is string => typeof val === "string"));
  }).toThrow();
});

test("can convert to JSON schema when errorOnIs is false", () => {
  expect(t.toJSONSchema(
    "str",
    t.is("string", (val: any): val is string => typeof val === "string"),
    { errorOnIs: false },
  )).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: "str",
    description: "string",
  });
});

test("passes when the fn returns true", () => {
  const check = t.is('string', (val: any): val is string => typeof val === 'string')
  check.assert('foo');
})

test("fails when the fn returns false", () => {
  const check = t.is('numba', (val: any): val is number => typeof val === 'number')
  expect(() => {
    check.assert('not a numba??')
  }).toThrow();
})

test("works as a guard w/ type inference", () => {
  class Doggo {
    bark() { return true }
  }
  function maybeDoggo(): Doggo | string {
    return new Doggo()
  }
  const check = t.is("a doggo", (val: any): val is Doggo => val instanceof Doggo)
  const yolo = maybeDoggo()
  // if uncommented, this *SHOULD* fail to compile
  // yolo.bark()

  let success = false
  if (check.guard(yolo)) {
    success = yolo.bark()
  }

  expect(success).toBe(true)
})
