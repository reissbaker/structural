import * as t from "..";
describe("toTypescript", () => {
  describe("partial", () => {
    test("Uses Partial<> type signifier", () => {
      const str = t.toTypescript(t.partial(t.subtype({
        hi: t.str,
      })));
      expect(str).toEqual("Partial<{\n  hi: string,\n}>");
    });
    test("Correctly refs out inner structs", () => {
      const a = t.subtype({
        hi: t.str,
      });
      const b = t.partial(a);
      const str = t.toTypescript({ a, b });
      expect(str).toEqual(
        "type a = {\n  hi: string,\n};\n\ntype b = Partial<a>;"
      );
    });
  });

  describe("deepPartial", () => {
    test("Uses Partial<> type signifier", () => {
      const str = t.toTypescript(t.partial(t.subtype({
        hi: t.str,
      })));
      expect(str).toEqual("Partial<{\n  hi: string,\n}>");
    });
    test("Correctly refs out inner structs if they aren't further nested", () => {
      const a = t.subtype({
        hi: t.str,
      });
      const b = t.deepPartial(a);
      const str = t.toTypescript({ a, b });
      expect(str).toEqual(
        "type a = {\n  hi: string,\n};\n\ntype b = Partial<a>;"
      );
    });
    test("Doesn't ref out inner structs if they are further nested", () => {
      const a = t.subtype({
        hi: t.str,
      });
      const b = t.subtype({
        a,
      });
      const c = t.deepPartial(b);
      const str = t.toTypescript({ a, b, c });
      expect(str).toEqual(
        "type a = {\n  hi: string,\n};\n\ntype b = {\n  a: a,\n};\n\ntype c = Partial<{\n  a?: Partial<a>\n    | undefined,\n}>;"
      );
    });
  });
});

describe("partial", () => {
  test("accepts exact matches", () => {
    const check = t.partial(t.subtype({
      hi: t.str,
    }));
    check.assert({ hi: "world" });
  });

  test("accepts supertypes", () => {
    const check = t.partial(t.subtype({
      hi: t.str,
    }));
    check.assert({ hi: "world", foo: "bar" });
  });

  test("rejects supertypes with exact", () => {
    const check = t.partial(t.exact({
      hi: t.str,
    }));
    expect(() => {
      check.assert({ hi: "world", foo: "bar" });
    }).toThrow();
  });

  test("allows optional keys to be missing", () => {
    const check = t.partial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({ hi: "world" })
  });

  test("allows optional keys that exist, but are undefined", () => {
    const check = t.partial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({ hi: "world", opt: undefined })
  });

  test("allows previously-required keys to be missing", () => {
    const check = t.partial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({})
  });

  test("allows previously-required keys to be undefined", () => {
    const check = t.partial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({ hi: undefined })
  });

  test("does not allow previously-required nested keys to be missing", () => {
    const check = t.partial(t.subtype({
      hi: t.subtype({
        world: t.str,
      }),
    }));

    expect(() => {
      check.assert({ hi: {} })
    }).toThrow();
  });
});

describe("deepPartial", () => {
  test("accepts exact matches", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.str,
    }));
    check.assert({ hi: "world" });
  });

  test("accepts supertypes with subtype", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.str,
    }));
    check.assert({ hi: "world", foo: "bar" });
  });

  test("rejects supertypes with exact", () => {
    const check = t.deepPartial(t.exact({
      hi: t.str,
    }));
    expect(() => {
      check.assert({ hi: "world", foo: "bar" });
    }).toThrow();
  });

  test("allows optional keys to be missing", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({ hi: "world" })
  });

  test("allows optional keys that exist, but are undefined", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({ hi: "world", opt: undefined })
  });

  test("allows previously-required keys to be missing", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({})
  });

  test("allows previously-required keys to be undefined", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.str,
      opt: t.optional(t.bool),
    }));

    check.assert({ hi: undefined })
  });

  test("allows previously-required nested keys to be missing", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.subtype({
        world: t.str,
      }),
    }));

    check.assert({ hi: {} })
  });

  test("allows previously-required nested keys to be missing from dicts", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.dict(t.subtype({
        world: t.str,
      })),
    }));

    check.assert({ hi: { ok: {} } })
  });
  test("converts nested partials to deep partials", () => {
    const check = t.deepPartial(t.subtype({
      hi: t.partial(t.subtype({
        world: t.subtype({
          foo: t.str,
        }),
      })),
    }));

    check.assert({ hi: { world: {} } })
  });
});
