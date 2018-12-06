import * as t from "..";

test("functions act as generics", () => {
  function genericStruct<T>(u: t.Type<T>) {
    return t.subtype({
      hi: t.str,
      foo: u,
    });
  }

  const strType = genericStruct(t.str);
  const numType = genericStruct(t.num);

  strType.assert({
    hi: "world",
    foo: "baz",
  });

  numType.assert({
    hi: "world",
    foo: 5,
  });

  expect(() => {
    strType.assert({
      hi: "world",
      foo: 5,
    });
  }).toThrow();

  expect(() => {
    numType.assert({
      hi: "world",
      foo: "baz",
    });
  }).toThrow();
});
