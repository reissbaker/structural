import * as t from "..";

describe("subtype", () => {
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
    })
    check.assert({ hi: "world" })
  })

  test("rejects optional keys that exist, but are undefined", () => {
    const check = t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    })
    expect(() => {
      check.assert({ hi: "world", opt: undefined })
    }).toThrow()
  })

  test("type inference allows omitting optional keys", () => {
    const check = t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    })

    type Derpus = t.GetType<typeof check>

    const wat: Derpus = {
      hi: 'dog',
    }

    check.assert(wat)
  })

  test("type inference allows omitting optional keys with .t", () => {
    const check = t.subtype({
      email: t.str,
      name: t.optional(t.str),
    })

    check.t({ email: 'bob@example.com' })
  })

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
    })
    check.assert({ hi: "world" })
  })

  test("rejects optional keys that exist, but are undefined", () => {
    const check = t.exact({
      hi: t.str,
      opt: t.optional(t.bool),
    })
    expect(() => {
      check.assert({ hi: "world", opt: undefined })
    }).toThrow()
  })

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
