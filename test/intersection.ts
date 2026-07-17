import { describe, expect, test } from "vitest";
import * as t from "..";

type A = { a: string };
type B = { b: number };
type C = { c: boolean };

const a = t.subtype({ a: t.str });
const b = t.subtype({ b: t.num });
const c = t.subtype({ c: t.bool });

function expectAcceptedByCheckAndSlice<T>(type: t.Type<T>, value: unknown) {
  expect(type.check(value)).not.toBeInstanceOf(t.Err);
  expect(type.sliceResult(value)).not.toBeInstanceOf(t.Err);
}

function expectRejectedByCheckAndSlice<T>(type: t.Type<T>, value: unknown) {
  expect(type.check(value)).toBeInstanceOf(t.Err);
  expect(type.sliceResult(value)).toBeInstanceOf(t.Err);
}

describe("normalized intersections", () => {
  test("keeps unmergeable operands in one flat intersection", () => {
    const type = t.num.and(t.value(5)).and(t.is<number>(
      "positive",
      (value: any): value is number => typeof value === "number" && value > 0,
    ));

    expect(type).toBeInstanceOf(t.Intersection);
    expect((type as t.Intersection<number>).operands).toHaveLength(3);
    expectAcceptedByCheckAndSlice(type, 5);
    expectRejectedByCheckAndSlice(type, -1);
  });

  test("merges structural operands across an intervening validator in either order", () => {
    const validatedA = a.validate("has the original extra property", value => {
      return (value as A & { extra?: boolean }).extra === true;
    });
    const input = { a: "hello", b: 1, extra: true };
    const expected = { a: "hello", b: 1 };

    const forward = validatedA.and(b);
    const reverse = b.and(validatedA);

    expectAcceptedByCheckAndSlice(forward, input);
    expectAcceptedByCheckAndSlice(reverse, input);
    expect(forward.slice(input)).toEqual(expected);
    expect(reverse.slice(input)).toEqual(expected);
  });

  test("validates every operand against the original input", () => {
    const type = a.validate("has extra", value => {
      return (value as A & { extra?: string }).extra === "kept for validation";
    }).and(b);

    const accepted = {
      a: "hello",
      b: 1,
      extra: "kept for validation",
    };
    const rejected = {
      a: "hello",
      b: 1,
      extra: "wrong",
    };

    expect(type.slice(accepted)).toEqual({ a: "hello", b: 1 });
    expectAcceptedByCheckAndSlice(type, accepted);
    expectRejectedByCheckAndSlice(type, rejected);
  });

  test("merges through comments while preserving both projected shapes", () => {
    const input = { a: "hello", b: 1, extra: "sliced" };

    const forward = a.comment("A").and(b.comment("B"));
    const reverse = b.comment("B").and(a.comment("A"));

    expect(forward.slice(input)).toEqual({ a: "hello", b: 1 });
    expect(reverse.slice(input)).toEqual({ a: "hello", b: 1 });
  });

  test("normalizes three container operands regardless of grouping", () => {
    const arrays = {
      a: t.array(a),
      b: t.array(b),
      c: t.array(c),
    };
    const input = [{ a: "hello", b: 1, c: true, extra: "sliced" }];
    const expected = [{ a: "hello", b: 1, c: true }];

    const leftGrouped = arrays.a.and(arrays.b).and(arrays.c);
    const rightGrouped = arrays.a.and(arrays.b.and(arrays.c));

    const leftSliced = leftGrouped.slice(input);
    const element: A & B & C = leftSliced[0];

    expect(element).toEqual(expected[0]);
    expect(leftSliced).toEqual(expected);
    expect(rightGrouped.slice(input)).toEqual(expected);
  });
});

describe("opaque intersection projections", () => {
  test("instance checks preserve class identity in either operand order", () => {
    class Model {
      constructor(readonly a: string, readonly extra: string) {}
    }

    const instance = new Model("hello", "preserved");
    const instanceType = t.instanceOf(Model);

    const forward = instanceType.and(a);
    const reverse = a.and(instanceType);

    expectAcceptedByCheckAndSlice(forward, instance);
    expectAcceptedByCheckAndSlice(reverse, instance);
    expect(forward.slice(instance)).toBe(instance);
    expect(reverse.slice(instance)).toBe(instance);
  });

  test("predicate-only guards preserve the original value", () => {
    const hasA = t.is<A>("A", (value: any): value is A => {
      return typeof value === "object" && value !== null && typeof value.a === "string";
    });
    const hasB = t.is<B>("B", (value: any): value is B => {
      return typeof value === "object" && value !== null && typeof value.b === "number";
    });
    const input = { a: "hello", b: 1, extra: "cannot be projected from guards" };

    const result = hasA.and(hasB).slice(input);

    expect(result).toBe(input);
  });
});

describe("object intersection projections", () => {
  test("dictionary constraints apply to present optional struct fields", () => {
    const optionalStruct = t.subtype({
      known: t.optional(t.str),
    });

    for(const type of [
      optionalStruct.and(t.dict(t.str)),
      t.dict(t.str).and(optionalStruct),
    ]) {
      expectAcceptedByCheckAndSlice(type, {});
      expectAcceptedByCheckAndSlice(type, { known: "hello" });
      expectRejectedByCheckAndSlice(type, { known: undefined });
    }
  });

  test("normalizes grouped dictionary and struct constraints", () => {
    const aDict = t.dict(a);
    const bDict = t.dict(b);
    const knownC = t.subtype({ known: c });
    const input = {
      known: { a: "hello", b: 1, c: true, extra: "sliced" },
      unknown: { a: "world", b: 2, extra: "sliced" },
    };
    const expected = {
      known: { a: "hello", b: 1, c: true },
      unknown: { a: "world", b: 2 },
    };

    for(const type of [
      aDict.and(bDict).and(knownC),
      aDict.and(bDict.and(knownC)),
    ]) {
      expectAcceptedByCheckAndSlice(type, input);
      expect(type.slice(input)).toEqual(expected);
      expectRejectedByCheckAndSlice(type, {
        known: { a: "hello", b: 1, c: true },
        unknown: { a: "world" },
      });
    }
  });

  test("dictionary constraints project named struct fields in either operand order", () => {
    const input = {
      known: { a: "hello", b: 1, extra: "sliced" },
      unknown: { a: "world", extra: "sliced" },
    };
    const expected = {
      known: { a: "hello", b: 1 },
      unknown: { a: "world" },
    };

    for(const type of [
      t.dict(a).and(t.subtype({ known: b })),
      t.subtype({ known: b }).and(t.dict(a)),
    ]) {
      expect(type.slice(input)).toEqual(expected);
    }
  });
});

describe("container intersection projections", () => {
  test("arrays merge child projectors in either operand order", () => {
    const input = [{ a: "hello", b: 1, extra: "sliced" }];
    const expected = [{ a: "hello", b: 1 }];

    for(const type of [ t.array(a).and(t.array(b)), t.array(b).and(t.array(a)) ]) {
      const sliced = type.slice(input);
      const element: A & B = sliced[0];
      expect(element).toEqual(expected[0]);
    }
  });

  test("maps merge value projectors in either operand order", () => {
    const input = new Map([
      [ "key", { a: "hello", b: 1, extra: "sliced" } ],
    ]);

    for(const type of [
      t.map(t.str, a).and(t.map(t.str, b)),
      t.map(t.str, b).and(t.map(t.str, a)),
    ]) {
      expect(type.slice(input).get("key")).toEqual({ a: "hello", b: 1 });
    }
  });

  test("maps merge key projectors", () => {
    const input = new Map([
      [ { a: "hello", b: 1, extra: "sliced" }, "value" ],
    ]);
    const type = t.map(a, t.str).and(t.map(b, t.str));
    const slicedKey = [ ...type.slice(input).keys() ][0];

    expect(slicedKey).toEqual({ a: "hello", b: 1 });
  });

  test("sets merge child projectors in either operand order", () => {
    const input = new Set([
      { a: "hello", b: 1, extra: "sliced" },
    ]);

    for(const type of [ t.set(a).and(t.set(b)), t.set(b).and(t.set(a)) ]) {
      const sliced = type.slice(input);
      const element: A & B = [ ...sliced ][0];
      expect(element).toEqual({ a: "hello", b: 1 });
    }
  });
});
