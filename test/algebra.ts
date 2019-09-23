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

  test("preserves exactness on the side that is exact", () => {
    const check = t.exact({ hi: t.str }).or(t.subtype({ hello: t.str }));
    expect(() => {
      check.assert({
        hi: "world",
        extra: "uh oh",
      });
    }).toThrow();

    check.assert({
      hello: "world",
      extra: "ok",
    });
  });

  test("preserves slicing behavior on the side that is key-tracking", () => {
    const check = t.subtype({ hi: t.str }).or(t.num);
    expect(check.slice({
      hi: "world",
      extra: "sliced",
    })).toEqual({
      hi: "world",
    });

    expect(check.slice(10)).toEqual(10);
  });
});

describe("and", () => {
  test("accepts values that pass both of the checks", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    check.assert({
      hi: "world",
      foo: "bar",
    });
  });

  test("accepts values that pass both of the checks with subtype behavior", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    check.assert({
      hi: "world",
      foo: "bar",
      extra: "ok",
    });
  });

  test("accepts values that pass both of the checks with exact types", () => {
    const check = t.exact({ hi: t.str }).and(t.exact({ foo: t.str }));
    check.assert({
      hi: "world",
      foo: "bar",
    });
  });

  test("preserves exactness if both sides are exact", () => {
    const check = t.exact({ hi: t.str }).and(t.exact({ foo: t.str }));
    expect(() => {
      check.assert({
        hi: "world",
        foo: "bar",
        extra: "uh oh",
      });
    }).toThrow();
  });

  test("does not preserve exactness if the left side is inexact", () => {
    const check = t.subtype({ hi: t.str }).and(t.exact({ foo: t.str }));
    check.assert({
      hi: "world",
      foo: "bar",
      extra: "uh oh",
    });
  });

  test("does not preserve exactness if the right side is inexact", () => {
    const check = t.exact({ hi: t.str }).and(t.subtype({ foo: t.str }));
    check.assert({
      hi: "world",
      foo: "bar",
      extra: "uh oh",
    });
  });

  test("preserves exactness through .or calls", () => {
    const check = t.exact({ hi: t.str }).and(
      t.exact({ foo: t.str }).or(t.subtype({ test: t.str }))
    );

    // should pass: exact match
    check.assert({
      hi: "world",
      foo: "bar",
    });

    // should fail: two exacts and-ed together
    expect(() => {
      check.assert({
        hi: "world",
        foo: "bar",
        extra: "uh oh",
      });
    }).toThrow();

    // should pass: exact and subtype and-ed together
    check.assert({
      hi: "world",
      test: "bar",
      extra: "ok",
    });
  });

  test("preserves exactness through other .and calls", () => {
    const check = t.exact({ hi: t.str }).and(
      t.exact({ foo: t.str }).and(t.exact({ test: t.str }))
    );

    // should pass: exact match
    check.assert({
      hi: "world",
      foo: "bar",
      test: "test",
    });

    // should fail: exacts and-ed together
    expect(() => {
      check.assert({
        hi: "world",
        foo: "bar",
        test: "test",
        extra: "uh oh",
      });
    }).toThrow();
  });

  test("preserves inexactness through other .and calls", () => {
    let check = t.exact({ hi: t.str }).and(
      t.exact({ foo: t.str }).and(t.subtype({ test: t.str }))
    );

    // should pass: exacts and subtypes and-ed together
    check.assert({
      hi: "world",
      foo: "bar",
      test: "test",
      extra: "uh oh",
    });
  });

  test("works with non-keyed types", () => {
    const check = t.num.and(t.value(5));
    check.assert(5);
    expect(() => {
      check.assert(6);
    }).toThrow();
  });

  test("preserves key slicing behavior of structs", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    expect(check.slice({
      hi: "world",
      foo: "bar",
      extra: "sliced",
    })).toEqual({
      hi: "world",
      foo: "bar",
    });
  });

  test("fails on slices that fail exactness checking", () => {
    const check = t.exact({ hi: t.str }).and(t.exact({ foo: t.str }));
    expect(check.slice({
      hi: "world",
      foo: "bar",
    })).toEqual({
      hi: "world",
      foo: "bar",
    });

    expect(() => {
      check.slice({
        hi: "world",
        foo: "bar",
        extra: "explode",
      });
    }).toThrow();
  });

  test("preserves slicing behavior through or calls", () => {
    const check = t.subtype({ hi: t.str }).and(
      t.subtype({ foo: t.str }).or(t.subtype({ test: t.str }))
    );

    expect(check.slice({
      hi: "world",
      test: "test",
      extra: "sliced",
    })).toEqual({
      hi: "world",
      test: "test",
    });
  });

  test("rejects values that don't pass the first check", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    expect(() => {
      check.assert({
        foo: "bar",
      });
    }).toThrow();
  });

  test("rejects values that don't pass the second check", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    expect(() => {
      check.assert({
        hi: "world",
      });
    }).toThrow();
  });

  test("rejects values that pass neither of the checks", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    expect(() => {
      check.assert({});
    }).toThrow();
  });

  test("toString", () => {
    const check = t.num.or(t.str)
    expect(check.toString()).toEqual("number | string")

    expect(t.num.and(t.value(5)).toString()).toEqual("number & 5")
  })
});
