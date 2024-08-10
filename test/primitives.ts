import * as t from "..";

describe("num", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.num)).toEqual("number");
  });
  test("converts to JSON schema", () => {
    expect(t.toJSONSchema("num", t.num)).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "num",
      type: "number",
    });
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

describe("bigint", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.bigint)).toEqual("bigint");
  });
  test("can't convert to JSON Schema", () => {
    expect(() => {
      t.toJSONSchema("no", t.bigint);
    }).toThrow();
  });
});

describe("str", () => {
  test("converts to typescript", () => {
    expect(t.toTypescript(t.str)).toEqual("string");
  });

  test("converts to JSON Schema", () => {
    expect(t.toJSONSchema("str", t.str)).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "str",
      type: "string",
    });
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

  test("converts to JSON Schema", () => {
    expect(t.toJSONSchema("bool", t.bool)).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "bool",
      type: "boolean",
    });
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

  test("can't convert to JSON Schema", () => {
    expect(() => {
      t.toJSONSchema("no", t.fn);
    }).toThrow();
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

  test("can't convert to JSON Schema", () => {
    expect(() => {
      t.toJSONSchema("no", t.sym);
    }).toThrow();
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

  test("can't convert to JSON Schema", () => {
    expect(() => {
      t.toJSONSchema("no", t.undef);
    }).toThrow();
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

  test("converts to JSON Schema", () => {
    expect(t.toJSONSchema("null", t.nil)).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "null",
      type: "null",
    });
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

  test("converts to JSON schema", () => {
    expect(t.toJSONSchema("obj", t.obj)).toEqual({
      $schema: t.JSON_SCHEMA_VERSION,
      title: "obj",
      type: "object",
      properties: {},
    });
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
