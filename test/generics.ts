import * as t from "..";

test("functions act as generics", () => {
  function genericStruct<T>(u: t.Check<T>) {
    return t.subtype({
      hi: t.str,
      foo: u,
    });
  }

  const strCheck = genericStruct(t.str);
  const numCheck = genericStruct(t.num);

  strCheck.assert({
    hi: "world",
    foo: "baz",
  });

  numCheck.assert({
    hi: "world",
    foo: 5,
  });

  expect(() => {
    strCheck.assert({
      hi: "world",
      foo: 5,
    });
  }).toThrow();

  expect(() => {
    numCheck.assert({
      hi: "world",
      foo: "baz",
    });
  }).toThrow();
});
