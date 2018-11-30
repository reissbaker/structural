import * as t from "..";

describe("num", () => {
  test("accepts numbers", () => {
    t.num.assert(1);
  });

  test("rejects non-numbers", () => {
    expect(() => {
      t.num.assert("hi");
    }).toThrow();
  });
});

describe("str", () => {
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
