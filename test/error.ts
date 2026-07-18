import { describe, expect, test } from "vitest";
import * as t from "../index";

function errorOf<T>(result: t.Result<T>): t.Err<T> {
  expect(result).toBeInstanceOf(t.Err);
  if(!(result instanceof t.Err)) throw new Error("Expected check to fail");
  return result;
}

describe("structured issues", () => {
  test("keeps message as a formatted string data property", () => {
    const error = errorOf(t.str.check(5));
    const descriptor = Object.getOwnPropertyDescriptor(error, "message");

    expect(descriptor && descriptor.get).toBeUndefined();
    expect(descriptor && descriptor.value).toBe("number is not a string");
    expect(error.message).toBe(t.formatIssue(error.issue));
  });

  test("preserves the issue and formatted message when converting to TypeError", () => {
    const result = errorOf(t.str.check(5));
    const error = result.toError();

    expect(error).toBeInstanceOf(t.TypeError);
    expect(error.issue).toBe(result.issue);
    expect(error.message).toBe(result.message);
  });

  test("exposes a structured nested issue", () => {
    const error = errorOf(t.subtype({ age: t.num }).check({ age: "private" }));

    expect(error.issue).toEqual({
      kind: "at",
      subject: "object",
      path: [ { kind: "property", key: "age" } ],
      issue: {
        kind: "type",
        expected: "number",
        subject: "string",
      },
    });
  });

  test("uses the inspected object as the subject of a missing property", () => {
    const error = errorOf(t.subtype({ name: t.str }).check({}));

    expect(error.issue).toEqual({
      kind: "at",
      subject: "object",
      path: [ { kind: "property", key: "name" } ],
      issue: {
        kind: "missing",
        subject: "object",
      },
    });
    expect(error.message).toBe(".name is missing");
  });
});

describe("issue formatting", () => {
  test("formats nested properties and sibling failures", () => {
    const type = t.subtype({
      name: t.str,
      profile: t.subtype({ age: t.num }),
      email: t.str,
    });
    const error = errorOf(type.check({
      name: 5,
      profile: { age: "private" },
    }));

    expect(error.message).toBe([
      ".name is not a string",
      ".profile.age is not a number",
      ".email is missing",
    ].join("\n"));
  });

  test("formats property names that require bracket notation", () => {
    const error = errorOf(t.subtype({
      "not-valid": t.str,
    }).check({ "not-valid": 5 }));

    expect(error.message).toBe("[\"not-valid\"] is not a string");
  });

  test("formats array indexes", () => {
    const type = t.subtype({
      users: t.array(t.subtype({ name: t.str })),
    });
    const error = errorOf(type.check({
      users: [ { name: "valid" }, { name: 5 } ],
    }));

    expect(error.message).toBe(".users[1].name is not a string");
  });

  test("formats map keys and values by entry position", () => {
    const keyError = errorOf(t.map(t.num, t.str).check(new Map([[ "private", "value" ]])));
    const valueError = errorOf(t.map(t.str, t.subtype({ id: t.num })).check(
      new Map([[ "private", { id: "private" } ]]),
    ));

    expect(keyError.message).toBe("<1st key in map> is not a number");
    expect(valueError.message).toBe("<1st value in map>.id is not a number");
  });

  test("formats ordinal suffixes through 23rd", () => {
    const ordinals = [
      "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th",
      "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th", "20th",
      "21st", "22nd", "23rd",
    ];

    const messages = ordinals.map((_, index) => t.formatIssue({
      kind: "at",
      subject: "map",
      path: [ { kind: "map-key", index } ],
      issue: { kind: "type", expected: "number", subject: "string" },
    }));

    expect(messages).toEqual(ordinals.map(value => `<${value} key in map> is not a number`));
  });

  test("formats set values by iteration position", () => {
    const error = errorOf(t.set(t.subtype({ id: t.num })).check(
      new Set([{ id: "private" }]),
    ));

    expect(error.message).toBe("<1st value in set>.id is not a number");
  });

  test("does not render dictionary or unknown property names", () => {
    const dictionaryError = errorOf(t.subtype({
      settings: t.dict(t.num),
    }).check({ settings: { "private-key": "private" } }));
    const exactError = errorOf(t.subtype({
      profile: t.exact({}),
    }).check({ profile: { "private-one": 1, "private-two": 2 } }));

    expect(dictionaryError.message).toBe(".settings.<1st value in dictionary> is not a number");
    expect(exactError.message).toBe(".profile has 2 unknown properties");
  });

  test("condenses simple union failures", () => {
    const error = errorOf(t.num.or(t.str).or(t.nil).check(false));

    expect(error.message).toBe("boolean is not a number, a string, or null");
  });

  test("preserves structural union branches", () => {
    const type = t.subtype({
      kind: t.value("cat"),
      lives: t.num,
    }).or(t.subtype({
      kind: t.value("dog"),
      good: t.bool,
    }));
    const error = errorOf(type.check({ kind: "bird" }));

    expect(error.message).toBe([
      "object did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. .kind does not equal \"cat\"",
      "   .lives is missing",
      "2. .kind does not equal \"dog\"",
      "   .good is missing",
    ].join("\n"));
  });

  test("formats merged structural intersections", () => {
    const type = t.subtype({
      profile: t.subtype({
        name: t.str,
      }),
    }).and(t.subtype({
      profile: t.subtype({
        age: t.num,
      }),
      enabled: t.bool,
    }));
    const error = errorOf(type.check({
      profile: {
        name: 5,
        age: "private",
      },
      enabled: "private",
    }));

    expect(error.message).toBe([
      ".profile.name is not a string",
      ".profile.age is not a number",
      ".enabled is not a boolean",
    ].join("\n"));
  });

  test("formats structural unions nested inside intersections", () => {
    const base = t.subtype({
      payload: t.subtype({
        id: t.str,
      }),
    });
    const variant = t.subtype({
      payload: t.subtype({
        email: t.str,
      }).or(t.subtype({
        phone: t.str,
      })),
    });
    const error = errorOf(base.and(variant).check({
      payload: {
        id: 5,
        email: 6,
        phone: 7,
      },
    }));

    expect(error.message).toBe([
      ".payload did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. .payload.email is not a string",
      "   .payload.id is not a string",
      "2. .payload.phone is not a string",
      "   .payload.id is not a string",
    ].join("\n"));
  });

  test("formats intersections distributed across structural unions", () => {
    const metadata = t.subtype({
      meta: t.subtype({
        requestId: t.str,
      }),
    });
    const userEvent = t.subtype({
      kind: t.value("user"),
      payload: t.subtype({
        id: t.str,
      }).and(t.subtype({
        email: t.str,
      })),
    });
    const teamEvent = t.subtype({
      kind: t.value("team"),
      payload: t.subtype({
        id: t.num,
      }).and(t.subtype({
        members: t.array(t.str),
      })),
    });
    const event = metadata.and(userEvent.or(teamEvent));
    const error = errorOf(event.check({
      kind: "other",
      payload: {
        id: false,
        members: [ 1 ],
      },
      meta: {
        requestId: 5,
      },
    }));

    expect(error.message).toBe([
      "object did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. .kind does not equal \"user\"",
      "   .payload.id is not a string",
      "   .payload.email is missing",
      "   .meta.requestId is not a string",
      "2. .kind does not equal \"team\"",
      "   .payload.id is not a number",
      "   .payload.members[0] is not a string",
      "   .meta.requestId is not a string",
    ].join("\n"));
  });
});

describe("limited union error formatting", () => {
  const ManyErrors = t.subtype({
    data: t.subtype({
      one: t.str,
      two: t.str,
      three: t.str,
      four: t.str,
      five: t.str,
      six: t.str,
      seven: t.str,
      eight: t.str,
      nine: t.str,
      ten: t.str,
    }),
  });
  const TwoErrors = t.subtype({
    left: t.str,
    right: t.str,
  });
  function manyErrors(): t.Err<any> {
    return errorOf(ManyErrors.or(TwoErrors).check({ data: {} }));
  }

  test("limits nested errors independently for each option", () => {
    expect(manyErrors().formatError({ maxNestedErrors: 2 })).toBe([
      "object did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. .data.one is missing",
      "   .data.two is missing",
      "   ... 8 more errors omitted for this option.",
      "2. .left is missing",
      "   .right is missing",
    ].join("\n"));
  });

  test("keeps message fully formatted", () => {
    const error = manyErrors();

    expect(error.formatError()).toBe(error.message);
    expect(error.formatError({})).toBe(error.message);
    expect(error.message).toContain(".data.one is missing");
    expect(error.message).toContain(".data.ten is missing");
    expect(error.message).toContain(".left is missing");
    expect(error.message).toContain(".right is missing");
    expect(error.message).not.toContain("omitted");
  });

  test("formats Err and TypeError identically", () => {
    const error = manyErrors();
    const thrown = error.toError();

    expect(thrown.formatError({ maxNestedErrors: 2 })).toBe(error.formatError({ maxNestedErrors: 2 }));
    expect(thrown.message).toBe(error.message);
  });

  test("supports hiding every nested error", () => {
    expect(manyErrors().formatError({ maxNestedErrors: 0 })).toBe([
      "object did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. ... 10 more errors omitted for this option.",
      "2. ... 2 more errors omitted for this option.",
    ].join("\n"));
  });

  test("rejects invalid nested error counts", () => {
    const error = manyErrors();

    for(const count of [ -1, 1.5, NaN ]) {
      expect(() => error.formatError({ maxNestedErrors: count })).toThrow(RangeError);
      expect(() => error.toError().formatError({ maxNestedErrors: count })).toThrow(RangeError);
    }
  });

  test("limits options in a union nested beneath a property", () => {
    const type = t.subtype({
      payload: t.subtype({
        one: t.str,
        two: t.str,
      }).or(t.subtype({
        three: t.str,
        four: t.str,
      })),
    });
    const nested = errorOf(type.check({ payload: {} }));

    expect(nested.formatError({ maxNestedErrors: 1 })).toBe([
      ".payload did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. .payload.one is missing",
      "   ... 1 more error omitted for this option.",
      "2. .payload.three is missing",
      "   ... 1 more error omitted for this option.",
    ].join("\n"));
  });
});

describe("discriminated structural unions", () => {
  const SomeData = t.subtype({
    user: t.subtype({
      id: t.str,
      displayName: t.str,
    }),
    permissions: t.array(t.str),
  });
  const Response = t.subtype({
    type: t.value("error"),
    error: t.str,
  }).or(t.subtype({
    type: t.value("success"),
    data: SomeData,
  }));

  test("accepts both members that share a discriminant key", () => {
    const failed = {
      type: "error" as const,
      error: "Something went wrong",
    };
    const succeeded = {
      type: "success" as const,
      data: {
        user: {
          id: "user-1",
          displayName: "Matt",
        },
        permissions: [ "read", "write" ],
      },
    };

    expect(Response.check(failed)).not.toBeInstanceOf(t.Err);
    expect(Response.check(succeeded)).not.toBeInstanceOf(t.Err);
    expect(Response.assert(failed)).toBe(failed);
    expect(Response.assert(succeeded)).toBe(succeeded);
  });

  test("slices using the successful discriminated member", () => {
    const result = Response.slice({
      type: "success",
      data: {
        user: {
          id: "user-1",
          displayName: "Matt",
          privateExtra: "removed",
        },
        permissions: [ "read" ],
        privateExtra: "removed",
      },
      privateExtra: "removed",
    });

    expect(result).toEqual({
      type: "success",
      data: {
        user: {
          id: "user-1",
          displayName: "Matt",
        },
        permissions: [ "read" ],
      },
    });
  });

  test("explains every member when the discriminant matches neither", () => {
    const error = errorOf(Response.check({
      type: "pending",
    }));

    expect(error.message).toBe([
      "object did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. .type does not equal \"error\"",
      "   .error is missing",
      "2. .type does not equal \"success\"",
      "   .data is missing",
    ].join("\n"));
  });

  test("explains nested data errors when the discriminant matches", () => {
    const error = errorOf(Response.check({
      type: "success",
      data: {
        user: {
          id: 5,
        },
        permissions: [ "read", false ],
      },
    }));

    expect(error.message).toBe([
      "object did not match any option in the schema. There were 2 options, and all options had errors. The errors for each option were:",
      "1. .type does not equal \"error\"",
      "   .error is missing",
      "2. .data.user.id is not a string",
      "   .data.user.displayName is missing",
      "   .data.permissions[1] is not a string",
    ].join("\n"));
  });
});

describe("error privacy", () => {
  const secret = "VERY_SECRET_VALUE";

  function expectSecretAbsent(type: t.Type<any>, value: unknown): void {
    const error = errorOf(type.check(value));
    const thrown = error.toError();

    expect(error.message).not.toContain(secret);
    expect(thrown.message).not.toContain(secret);
    expect(JSON.stringify(error.issue)).not.toContain(secret);
  }

  test("does not retain or render rejected values", () => {
    expectSecretAbsent(t.num, secret);
    expectSecretAbsent(t.subtype({ token: t.num }), { token: secret });
    expectSecretAbsent(t.array(t.num), [ secret ]);
    expectSecretAbsent(t.map(t.num, t.num), new Map([[ secret, 1 ]]));
    expectSecretAbsent(t.map(t.num, t.num), new Map([[ 1, secret ]]));
    expectSecretAbsent(t.set(t.num), new Set([ secret ]));
    expectSecretAbsent(t.num.or(t.bool), secret);
  });

  test("does not retain or render input-derived property names", () => {
    expectSecretAbsent(t.dict(t.num), { [secret]: secret });
    expectSecretAbsent(t.exact({}), { [secret]: true });
  });

  test("does not retain or render exceptions thrown by callbacks", () => {
    expectSecretAbsent(t.num.validate("safe description", () => {
      throw new Error(secret);
    }), 1);
    expectSecretAbsent(t.is("safe guard", (_: unknown): _ is true => {
      throw new Error(secret);
    }), true);
  });

  test("does not coerce rejected objects while creating errors", () => {
    const input = {
      toString(): string {
        throw new Error("toString called");
      },
      valueOf(): never {
        throw new Error("valueOf called");
      },
      [Symbol.toPrimitive](): never {
        throw new Error("Symbol.toPrimitive called");
      },
    };

    const error = errorOf(t.str.check(input));
    expect(error.message).toBe("object is not a string");
  });
});
