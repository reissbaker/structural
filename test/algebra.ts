import * as t from "..";

describe("or", () => {
  test("converts both sides to typescript", () => {
    expect(t.toTypescript(t.num.or(t.str))).toEqual("number\n  | string");
  });

  test("converts to JSON Schema", () => {
    expect(t.toJSONSchema("union", t.num.or(t.str).or(t.bool))).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "union",
      anyOf: [
        { type: "number" },
        { type: "string" },
        { type: "boolean" },
      ],
    });
  });

  test("converts union of value types to enum JSON Schema", () => {
    expect(t.toJSONSchema("enum", t.value("hello").or(t.value("world")).or(t.value(1)))).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "enum",
      enum: [ "hello", "world", 1 ],
    });
  });

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
  test("converts to typescript", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.str }));
    expect(t.toTypescript(check)).toEqual(`{\n  hi: string,\n}\n  & {\n    foo: string,\n  }`);
  });

  test("converts to JSON Schema", () => {
    const check = t.subtype({ hi: t.str }).and(t.subtype({ foo: t.optional(t.str) }));
    expect(t.toJSONSchema("check", check)).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "check",
      allOf: [
        {
          type: "object",
          required: [ "hi" ],
          properties: {
            hi: { type: "string" },
          },
        },
        {
          type: "object",
          required: [],
          properties: {
            foo: { type: "string" },
          },
        },
      ],
    });
  });

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

  test("preserved key slicing behavior of structs through multiple and calls", () => {
    const a = t.subtype({ hi: t.str });
    const b = t.subtype({ foo: t.str });
    const c = t.subtype({ world: t.str });
    const check = a.and(b).and(c);
    const sliced = check.slice({
      hi: "a",
      foo: "b",
      world: "c",
      extra: "d",
    });
    expect(sliced).toEqual({
      hi: "a",
      foo: "b",
      world: "c",
    });
    expect(Object.keys(sliced).sort()).toEqual([
      "hi", "foo", "world"
    ].sort());
  });

  test("preserved key slicing behavior of structs with dicts", () => {
    const a = t.subtype({ hi: t.str });
    const b = t.dict(t.str);
    const check = a.and(b);
    const sliced = check.slice({
      hi: "a",
      foo: "b",
      world: "c",
      extra: "d",
    });
    expect(sliced).toEqual({
      hi: "a",
      foo: "b",
      world: "c",
      extra: "d",
    });
    expect(Object.keys(sliced).sort()).toEqual([
      "hi", "foo", "world", "extra"
    ].sort());
  });

  test("enforces structs with dicts work", () => {
    const a = t.subtype({ hi: t.str });
    const b = t.dict(t.str);
    const check = a.and(b);
    expect(() => {
      check.slice({
        hi: "a",
        foo: "b",
        world: "c",
        extra: 1,
      });
    }).toThrow();
  });

  test("slicing multiple struct-dict ands works", () => {
    const a = t.subtype({ hi: t.str }).and(t.dict(t.str));
    const b = t.dict(t.str).and(t.subtype({ world: t.str }).and(t.dict(t.str)));
    const check = a.and(b);
    const sliced = check.slice({
      hi: "1",
      world: "2",
      extra: "3",
    });
    expect(sliced).toEqual({
      hi: "1",
      world: "2",
      extra: "3",
    });
    expect(Object.keys(sliced).sort()).toEqual([
      "hi",
      "world",
      "extra",
    ].sort());
  });

  test("checking multiple struct-dict ands works", () => {
    const a = t.subtype({ hi: t.str }).and(t.dict(t.str));
    const b = t.dict(t.str).and(t.subtype({ world: t.str }).and(t.dict(t.str)));
    const check = a.and(b);
    const sliced = check.assert({
      hi: "1",
      world: "2",
      extra: "3",
    });
    expect(sliced).toEqual({
      hi: "1",
      world: "2",
      extra: "3",
    });
    expect(Object.keys(sliced).sort()).toEqual([
      "hi",
      "world",
      "extra",
    ].sort());
  });

  test("slicing works when bracketed with or calls", () => {
    const a = t.subtype({ hi: t.str });
    const b = t.subtype({ world: t.str });
    const c = a.and(b);
    const d = t.subtype({ foo: t.str });
    const e = d.or(c);

    let sliced = e.slice({
      foo: "hi"
    });

    expect(sliced).toEqual({ foo: "hi" });
    expect(Object.keys(sliced)).toEqual([ "foo" ]);

    sliced = e.slice({
      hi: "a",
      world: "etc",
    });
    expect(sliced).toEqual({ hi: "a", world: "etc" });
    expect(Object.keys(sliced).sort()).toEqual([ "hi", "world" ].sort());
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

  test("rejects values that are impossible", () => {
    const numAndNil = t.num.and(t.nil);
    expect(() => {
      numAndNil.assert(1);
    }).toThrow();

    const strAndDict = t.str.and(t.dict(t.str));
    expect(() => {
      strAndDict.assert("");
    }).toThrow();
  });

  test("array merges follow typescript's weird bug", () => {
    const check = t.array(t.subtype({ hi: t.str })).and(t.array(t.subtype({ world: t.str })));
    const sliced = check.slice([{
      hi: "world",
    }]);
    type A = { hi: string };
    type B = { world: string };
    type C = Array<A> & Array<B>;
    const c: C = [];
    c.push({
      hi: "world",
    });
    expect(sliced[0]).toEqual({
      hi: "world",
    });
    expect(Object.keys(sliced[0])).toEqual([ "hi" ]);
  });

  test("partial merges slices work", () => {
    const check = t.subtype({
      hi: t.str,
    }).and(t.partial(t.subtype({
      world: t.num,
    })));

    let sliced = check.slice({
      hi: "there",
    });

    expect(sliced).toEqual({ hi: "there" });
    expect(Object.keys(sliced)).toEqual([ "hi" ]);

    sliced = check.slice({
      hi: "there",
      world: 5,
    });

    expect(sliced).toEqual({
      hi: "there",
      world: 5,
    });
    expect(Object.keys(sliced).sort()).toEqual([ "hi", "world" ].sort());
  });

  test("merging dicts of same key works", () => {
    const check = t.dict(t.num).and(t.dict(t.num));
    check.assert({
      hi: 1,
      world: 2,
      hooray: 4,
    });
  });

  test("merging dicts of same key explodes on any value", () => {
    const check = t.dict(t.num).and(t.dict(t.str));
    expect(() => {
      check.assert({
        hi: 1,
        world: 2,
        hooray: 4,
      });
    }).toThrow();
  });

  test("merging structs wrapped in comments works", () => {
    const a = t.subtype({
      hi: t.num,
    }).comment("A hi check");
    const b = t.subtype({
      world: t.str,
    }).comment("A world check");

    const check = a.and(b);
    const sliced = check.slice({
      hi: 4,
      world: "test",
      extra: true,
    });

    expect(sliced).toEqual({
      hi: 4,
      world: "test",
    });

    expect(Object.keys(sliced).sort()).toEqual([ "hi", "world" ].sort());
  });

  test("merging nested partials and non-partials", () => {
    const combat = t.value("dps").comment("damage-focused");
    const chardata = t.subtype({
      mainRole: combat,
    });
    const mergedchar = t.subtype({
      charData: t.partial(chardata).and(chardata),
    });
    const sliced = mergedchar.slice({
      charData: {
        mainRole: 'dps',
        extra: 'hello',
      },
    });
    expect(sliced).toEqual({
      charData: {
        mainRole: 'dps',
      },
    });
  });
});
