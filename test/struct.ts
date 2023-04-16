import * as t from "..";

describe("subtype", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.subtype({
      hi: t.str,
      world: t.subtype({
        foo: t.num,
      }),
    }))).toEqual("{\n  hi: string,\n  world: {\n    foo: number,\n  },\n}");
  });
  test("puts value comments above the line", () => {
    expect(t.toTypescript(t.subtype({
      foo: t.subtype({
        bar: t.str.comment("a comment"),
      }),
    }))).toEqual("{\n  foo: {\n    // a comment\n    bar: string,\n  },\n}");
  });
  test("puts multi-line value comments above the line with correct indentation", () => {
    expect(t.toTypescript(t.subtype({
      foo: t.subtype({
        bar: t.str.comment("a comment\nabout this"),
      }),
    }))).toEqual("{\n  foo: {\n    /*\n     * a comment\n     * about this\n     */\n    bar: string,\n  },\n}");
  });

  test("separates out fields in the middle of a fieldset the have comments", () => {
    expect(t.toTypescript(t.subtype({
      a: t.str,
      b: t.str.comment("sup"),
      c: t.str,
    }))).toEqual("{\n  a: string,\n\n  // sup\n  b: string,\n\n  c: string,\n}")
  });

  test("accepts exact matches", () => {
    const check = t.subtype({
      hi: t.str,
    });
    check.assert({ hi: "world" });
  });

  test("accepts supertypes", () => {
    const check = t.subtype({
      hi: t.str,
    });
    check.assert({ hi: "world", foo: "bar" });
  });

  test("allows optional keys to be missing", () => {
    const check = t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    });

    check.assert({ hi: "world" })
  });

  test("rejects optional keys that exist, but are undefined", () => {
    const check = t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    });

    expect(() => {
      check.assert({ hi: "world", opt: undefined })
    }).toThrow();
  });

  test("type inference allows omitting optional keys", () => {
    const check = t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    });

    type Derpus = t.GetType<typeof check>;

    const wat: Derpus = {
      hi: 'dog',
    };

    check.assert(wat);
  });

  test("type inference allows omitting optional keys with .t", () => {
    const check = t.subtype({
      email: t.str,
      name: t.optional(t.str),
    });

    check.literal({ email: 'bob@example.com' });
  });

  test("slice omits optional keys that are not defined", () => {
    const check = t.subtype({
      email: t.str,
      name: t.optional(t.str),
    });

    const result = check.slice({ email: 'bob@example.com' });
    expect(Object.keys(result)).toEqual(['email']);
  });

  test("rejects subtypes", () => {
    const check = t.subtype({
      hi: t.str,
      foo: t.str,
    });
    expect(() => {
      check.assert({ hi: "world" });
    }).toThrow();
  });

  test("rejects non-matching values", () => {
    const check = t.subtype({
      hi: t.str,
    });

    expect(() => {
      check.assert({ hi: 5 });
    }).toThrow();
  });

  test("rejects non-objects", () => {
    const check = t.subtype({});
    expect(() => {
      check.assert(false);
    }).toThrow();
  });

  test("rejects null", () => {
    const check = t.subtype({});
    expect(() => {
      check.assert(null);
    }).toThrow();
  });

  test("rejects arrays", () => {
    const check = t.subtype({});
    expect(() => {
      check.assert([]);
    }).toThrow();
  });
});

describe("exact", () => {
  test("accepts exact matches", () => {
    const check = t.exact({
      hi: t.str,
    });
    check.assert({ hi: "world" });
  });

  test("allows optional keys to be missing", () => {
    const check = t.exact({
      hi: t.str,
      opt: t.optional(t.bool),
    });
    check.assert({ hi: "world" });
  });

  test("rejects optional keys that exist, but are undefined", () => {
    const check = t.exact({
      hi: t.str,
      opt: t.optional(t.bool),
    });
    expect(() => {
      check.assert({ hi: "world", opt: undefined })
    }).toThrow();
  });

  test("rejects supertypes", () => {
    const check = t.exact({
      hi: t.str,
    });
    expect(() => {
      check.assert({ hi: "world", foo: "bar" });
    }).toThrow();
  });

  test("rejects subtypes", () => {
    const check = t.exact({
      hi: t.str,
      foo: t.str,
    });
    expect(() => {
      check.assert({ hi: "world" });
    }).toThrow();
  });

  test("rejects non-objects", () => {
    const check = t.exact({});
    expect(() => {
      check.assert(null);
    }).toThrow();
  });

  test("rejects arrays", () => {
    const check = t.exact({});
    expect(() => {
      check.assert([]);
    }).toThrow();
  });
});

describe('slice', () => {
  test('slices out only the known keys', () => {
    const check = t.subtype({
      foo: t.str,
    });

    expect(check.slice({
      foo: "bar",
      hello: "world",
    })).toEqual({
      foo: "bar",
    });
  });

  test('throws errors when the type mismatches', () => {
    const check = t.subtype({
      foo: t.str,
    });

    expect(() => {
      check.slice({});
    }).toThrow();
  });
});
