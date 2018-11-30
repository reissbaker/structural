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

  test("rejects subtypes", () => {
    const check = t.subtype({
      hi: t.str,
      foo: t.str,
    });
    expect(() => {
      check.assert({ hi: "world" });
    }).toThrow();
  });

  test("rejects non-objects", () => {
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
