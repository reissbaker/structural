import * as t from "..";
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
});
