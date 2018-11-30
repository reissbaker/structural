import * as t from "..";

describe("or", () => {
  test("accepts either of the given checks", () => {
    const check = t.num.or(t.str);
    check.assert(5);
    check.assert("hi");
  });

  test("rejects non-matching values", () => {
    expect(() => {
      const check = t.num.or(t.str);
      check.assert(true);
    }).toThrow();
  });

  test("accepts any of the matching checks in a sequence", () => {
    const check = t.num.or(t.str).or(t.bool);
    check.assert(5);
    check.assert("hi");
    check.assert(true);
  });
});

describe("and", () => {
  test("accepts values that pass both of the checks", () => {
    // TODO: this should pass with exact types!! but, it doesn't. fix that.
    // Intersect and Either types could be made aware of exactness, and automatically transform any
    // exacts into subtypes, and do special exactness checks on their own outside of the struct.
    // they'd also need to be aware of themselves, since they're taking on exactness responsibility.
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    check.assert({
      hi: "world",
      foo: "bar",
    });
  });

  test("rejects values that don't pass both of the checks", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    expect(() => {
      check.assert({
        hi: "world",
      });
    }).toThrow();
  });
});
