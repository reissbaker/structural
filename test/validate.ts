import * as t from "..";

test("converts to typescript", () => {
  expect(
    t.toTypescript(t.num.validate("greater than zero", (num) => num > 0))
  ).toEqual("// greater than zero\nnumber");
});

test("converts to JSON schema as a comment when errorOnValidations is false", () => {
  expect(
    t.toJSONSchema(">0", t.num.validate("greater than zero", (num) => num > 0), {
      errorOnValidations: false,
    })
  ).toEqual({
    $schema: t.JSON_SCHEMA_VERSION,
    title: ">0",
    description: "greater than zero",
    type: "number",
  });
});

test("can't convert to JSON Schema by default", () => {
  expect(() => {
    t.toJSONSchema(">0", t.num.validate("greater than zero", (num) => num > 0))
  }).toThrow();
});

test("passes when the fn returns true", () => {
  const check = t.num.validate("between five and ten", (num) => {
    return num > 5 && num < 10;
  });

  check.assert(6);
});

test("fails when the fn returns false", () => {
  const check= t.num.validate("non-zero", num => num !== 0);
  expect(() => {
    check.assert(0);
  }).toThrow();
});

test("fails when the fn throws", () => {
  const check = t.num.validate("never", (_) => {
    throw new Error();
  });

  expect(check.check(0)).toBeInstanceOf(t.Err);
});
