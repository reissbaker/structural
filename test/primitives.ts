import * as t from "..";

describe("num", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.num)).toEqual("number");
  });

  test("accepts numbers", () => {
    t.num.assert(1);
  });

  test("rejects non-numbers", () => {
    expect(() => {
      t.num.assert("hi");
    }).toThrow();
  });

  test("slice returns the number", () => {
    expect(t.num.slice(1)).toEqual(1);
  });
});

describe("str", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.str)).toEqual("string");
  });

  test("accepts strings", () => {
    t.str.assert("hi");
  });

  test("rejects non-strings", () => {
    expect(() => {
      t.str.assert(5);
    }).toThrow();
  });
});

describe("bool", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.bool)).toEqual("boolean");
  });

  test("accepts booleans", () => {
    t.bool.assert(true);
  });

  test("rejects non-boolean", () => {
    expect(() => {
      t.bool.assert(6);
    }).toThrow();
  });
});

describe("fn", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.fn)).toEqual("Function");
  });

  test("accepts functions", () => {
    t.fn.assert(() => {});
  });

  test("rejects non-functions", () => {
    expect(() => {
      t.fn.assert(false);
    }).toThrow();
  });
});

describe("sym", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.sym)).toEqual("Symbol");
  });

  test("accepts symbols", () => {
    t.sym.assert(Symbol());
  });

  test("rejects non-symbols", () => {
    expect(() => {
      t.sym.assert(5);
    }).toThrow();
  });
});

describe("undef", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.undef)).toEqual("undefined");
  });

  test("accepts undefined", () => {
    t.undef.assert(undefined);
  });

  test("rejects non-undefined", () => {
    expect(() => {
      t.undef.assert(null);
    }).toThrow();
  });
});

describe("nil", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.nil)).toEqual("null");
  });

  test("accepts null", () => {
    t.nil.assert(null);
  });

  test("rejects non-null", () => {
    expect(() => {
      t.nil.assert(undefined);
    }).toThrow();
  });
});

describe("obj", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.obj)).toEqual("Object");
  });

  test("accepts objects", () => {
    t.obj.assert({});
    t.obj.assert({ five: "hi" });
    t.obj.assert([]);
  });

  test("rejects non-objects", () => {
    expect(() => {
      t.obj.assert(5);
    }).toThrow();
  });
});

describe("maybe", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.maybe(t.num))).toEqual("number\n  | null");
  });

  test("accepts the matching value", () => {
    const check = t.maybe(t.num);
    check.assert(5);
  });

  test("accepts null", () => {
    const check = t.maybe(t.num);
    check.assert(null);
  });

  test("rejects non-matching values", () => {
    const check = t.maybe(t.num);
    expect(() => {
      check.assert(true);
    }).toThrow();
  });
});
