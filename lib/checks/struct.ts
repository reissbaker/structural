import { Err, Result } from "../result";
import { at, multiple } from "../issue";
import type { Issue } from "../issue";
import { typeMismatch } from "../issues/shared";
import { asKind } from "../as-kind";
import { Kind, TypedKind } from "../kind";
import { Comment, Either, Intersection, Projection, Type } from "../type";
import { GetType } from "../get-type";
import { undef } from "./primitives";

/*
 * MissingKey is a marker type that indicates that the key in a struct that holds an MissingKey is
 * optional. However, if the key is present, the value must typecheck T; it can't be left undefined.
 * This can be useful for verification but it's not equivalent to TypeScript's optional fields,
 * which can be left undefined even when present.
 */
export class MissingKey<T extends Type<any>> {
  constructor(readonly type: T) {}
}

/*
 * OptionalKey mimics TypeScript's ?: optional field syntax in types/interfaces: it allows the key
 * to be missing, or set to undefined.
 */
export class OptionalKey<T extends Type<any>> {
  constructor(readonly type: T) {}
}

type WrapperOrType<T> = T extends MissingKey<infer Inner> ? Inner :
  T extends OptionalKey<infer Inner> ? Inner : T;

type RawDict<V> = {
  [key: string]: V;
};

type ObjectField = {
  readonly checker: TypedKind<any>;
  readonly allowsMissing: boolean;
};

type ObjectFields = {
  [key: string]: ObjectField;
  [key: symbol]: ObjectField;
};

type ObjectShape = {
  readonly fields: ObjectFields;
  readonly exact: boolean;
  readonly requirePlainObject: boolean;
  readonly rest?: TypedKind<any>;
};

export type MissingIssue = {
  readonly kind: "missing";
  readonly subject: "object";
};

export type UnknownPropertyIssue = {
  readonly kind: "unknown-property";
  readonly subject: "object";
};

abstract class MergeableType<T> extends Type<T> {
  constructor(protected readonly objectShape: ObjectShape) {
    super();
  }

  check(val: any): Result<T> {
    const typeErr = basicObjectErr(val, this.objectShape.requirePlainObject);
    if(typeErr) return typeErr;

    const issues: Issue[] = [];
    for(const prop of ownKeys(this.objectShape.fields)) {
      const field = this.objectShape.fields[prop];
      if(!(prop in val)) {
        if(field.allowsMissing) continue;
        issues.push(at(
          { kind: "property", key: prop },
          { kind: "missing", subject: "object" },
          "object",
        ));
        continue;
      }

      const result = field.checker.check(val[prop]);
      if(result instanceof Err) {
        issues.push(at({ kind: "property", key: prop }, result.issue, "object"));
      }
    }

    const valueKeys = this.objectShape.exact ? enumerableOwnKeys(val) : Object.keys(val);
    let dictionaryIndex = 0;
    for(const prop of valueKeys) {
      if(hasOwn(this.objectShape.fields, prop)) continue;

      if(this.objectShape.rest) {
        const result = this.objectShape.rest.check(val[prop]);
        if(result instanceof Err) {
          issues.push(at(
            { kind: "dictionary-value", index: dictionaryIndex },
            result.issue,
            "object",
          ));
        }
        dictionaryIndex += 1;
      }
      else if(this.objectShape.exact) {
        issues.push(at(
          { kind: "property", key: prop },
          { kind: "unknown-property", subject: "object" },
          "object",
        ));
      }
    }

    if(issues.length === 0) return val as T;
    return new Err(multiple(issues, "object"));
  }

  /*
   * Type.sliceResult checks first and projects afterward, which normally means reading object
   * properties twice. A getter can return a different value on the second read, allowing slicing
   * to return a value that never passed validation. Validate and project each captured property
   * value together so the returned object contains exactly the values that were checked.
   */
  sliceResult(val: any): Result<T> {
    const typeErr = basicObjectErr(val, this.objectShape.requirePlainObject);
    if(typeErr) return typeErr;

    const result: { [key: string]: any } = {};
    const issues: Issue[] = [];
    for(const prop of ownKeys(this.objectShape.fields)) {
      const field = this.objectShape.fields[prop];
      if(!(prop in val)) {
        if(field.allowsMissing) continue;
        issues.push(at(
          { kind: "property", key: prop },
          { kind: "missing", subject: "object" },
          "object",
        ));
        continue;
      }

      const sliced = field.checker.sliceResult(val[prop]);
      if(sliced instanceof Err) {
        issues.push(at({ kind: "property", key: prop }, sliced.issue, "object"));
      }
      else setOwn(result, prop, sliced);
    }

    const valueKeys = this.objectShape.exact ? enumerableOwnKeys(val) : Object.keys(val);
    let dictionaryIndex = 0;
    for(const prop of valueKeys) {
      if(hasOwn(this.objectShape.fields, prop)) continue;

      if(this.objectShape.rest) {
        const sliced = this.objectShape.rest.sliceResult(val[prop]);
        if(sliced instanceof Err) {
          issues.push(at(
            { kind: "dictionary-value", index: dictionaryIndex },
            sliced.issue,
            "object",
          ));
        }
        else setOwn(result, prop, sliced);
        dictionaryIndex += 1;
      }
      else if(this.objectShape.exact) {
        issues.push(at(
          { kind: "property", key: prop },
          { kind: "unknown-property", subject: "object" },
          "object",
        ));
      }
    }

    if(issues.length === 0) return result as T;
    return new Err(multiple(issues, "object"));
  }

  protected merge<Incoming>(type: TypedKind<Incoming>): TypedKind<T & Incoming> | undefined {
    if(!(type instanceof MergeableType)) return undefined;

    return asKind<T & Incoming>(new MergeIntersect<T & Incoming>([
      ...mergeOperands(asKind(this)),
      ...mergeOperands(type),
    ]));
  }

  protected project(val: any): Projection<T> {
    const result: { [key: string]: any } = {};
    for(const prop of ownKeys(this.objectShape.fields)) {
      if(!(prop in val)) continue;

      const field = this.objectShape.fields[prop];
      const value = val[prop];
      const projection = this.projectionOf(field.checker, value);
      setOwn(result, prop, projection.kind === "none" ? value : projection.value);
    }

    if(this.objectShape.rest) {
      for(const prop of Object.keys(val)) {
        if(hasOwn(this.objectShape.fields, prop)) continue;

        const value = val[prop];
        const projection = this.projectionOf(this.objectShape.rest, value);
        setOwn(result, prop, projection.kind === "none" ? value : projection.value);
      }
    }

    return { kind: "structural", value: result as T };
  }
}

// Dicts and structs merge together in TypeScript, so we put both in the struct file
export class Dict<V> extends MergeableType<RawDict<V>> {
  readonly valueType: TypedKind<V>;
  constructor(v: Type<V>, readonly namedKey: string = "key") {
    super({ fields: emptyObjectFields(), exact: false, requirePlainObject: true, rest: asKind(v) });
    this.valueType = asKind(v);
  }

  keyName(key: string): Dict<V> {
    return new Dict(this.valueType, key);
  }
}

function emptyObjectFields(): ObjectFields {
  return Object.create(null) as ObjectFields;
}

function ownKeys<T extends object>(value: T): Array<Extract<keyof T, string | symbol>> {
  return Reflect.ownKeys(value) as Array<Extract<keyof T, string | symbol>>;
}

function enumerableOwnKeys(value: object): Array<string | symbol> {
  return Reflect.ownKeys(value).filter(key => {
    return Object.prototype.propertyIsEnumerable.call(value, key);
  });
}

function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function setOwn(target: object, key: PropertyKey, value: any): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function basicObjectErr<V>(val: any, requirePlainObject: boolean): Err<V> | undefined {
  const expected = requirePlainObject ? "dictionary" : "object";
  if(typeof val !== "object" || Array.isArray(val) || val === null) {
    return new Err(typeMismatch(expected, val));
  }
  if(requirePlainObject) {
    const prototype = Object.getPrototypeOf(val);
    if(prototype !== Object.prototype && prototype !== null) {
      return new Err(typeMismatch("dictionary", val));
    }
  }
  return undefined;
}

export function dict<V>(v: Type<V>): Dict<V> {
  return new Dict(v);
}

export type FieldDef = Type<any> | MissingKey<any> | OptionalKey<any>;

export type TypeStruct = {
  [key: string]: FieldDef;
  [key: symbol]: FieldDef;
};

// see this blog post for an explanation of this type shenanigans
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html

// Returns a type like `"foo" | "bar"` for all the optional keys in a typestruct
type OptionalPropertyNames<T extends TypeStruct> = {
  [K in keyof T]: T[K] extends MissingKey<any> ? K : T[K] extends OptionalKey<any> ? K : never;
}[keyof T];

// Unwraps Type<T> and OptionalKey<Type<T>> to T for all keys in a typestruct
type UnwrapTypes<T extends TypeStruct> = {
  [K in keyof T]: GetType<WrapperOrType<T[K]>>;
};

export type UnwrappedTypeStruct<T extends TypeStruct> =
  /* required props */ Pick<UnwrapTypes<T>, Exclude<keyof T, OptionalPropertyNames<T>>> &
  /* optional props */ Partial<Pick<UnwrapTypes<T>, OptionalPropertyNames<T>>>;

export type TypeStructFor<T> = {
  [K in keyof T]: Type<T[K]>;
};

export type StructFor<T> = Struct<TypeStructFor<T>>;

export function keyType<T extends Type<any>>(box: MissingKey<T> | OptionalKey<T> | T): T {
  if(box instanceof MissingKey || box instanceof OptionalKey) {
    return box.type;
  }

  return box;
}

export function allowsMissing<T extends Type<any>>(box: MissingKey<T> | T): box is MissingKey<T> {
  return (box instanceof MissingKey);
}

export function allowsOptional<T extends Type<any>>(box: MissingKey<T> | T): box is OptionalKey<T> {
  return (box instanceof OptionalKey);
}

function objectFields(definition: TypeStruct): ObjectShape["fields"] {
  const fields = emptyObjectFields();
  for(const prop of ownKeys(definition)) {
    const field = definition[prop];
    fields[prop] = {
      checker: field instanceof OptionalKey
        ? asKind(undef.or(field.type))
        : asKind(keyType(field)),
      allowsMissing: field instanceof MissingKey || field instanceof OptionalKey,
    };
  }
  return fields;
}

export class Struct<T extends TypeStruct> extends MergeableType<UnwrappedTypeStruct<T>> {
  readonly definition: T;
  readonly exact: boolean;

  constructor(definition: T, exact: boolean) {
    super({ fields: objectFields(definition), exact, requirePlainObject: false });
    this.definition = definition;
    this.exact = exact;
  }
}

export function subtype<T extends TypeStruct>(def: T): Struct<T> {
  return new Struct(def, false);
}

export function exact<T extends TypeStruct>(def: T): Struct<T> {
  return new Struct(def, true);
}

export function optional<T extends Type<any>>(check: T): OptionalKey<T> {
  return new OptionalKey(check);
}

export function allowMissing<T extends Type<any>>(check: T): MissingKey<T> {
  return new MissingKey(check);
}

type MakeOptional<T extends FieldDef> = T extends Type<any> ? OptionalKey<T> :
  T extends MissingKey<infer K> ? OptionalKey<K> : T;

type DeepPartialTypeStruct<T extends TypeStruct> = {
  [K in keyof T]: T[K] extends Struct<infer T2> ? OptionalKey<Struct<DeepPartialTypeStruct<T2>>> :
    MakeOptional<T[K]>
}

type PartialTypeStruct<T extends TypeStruct> = {
  [K in keyof T]: MakeOptional<T[K]>
};

export class PartialStruct<T extends TypeStruct> extends MergeableType<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
  private readonly hiddenTypeStruct: PartialTypeStruct<T>;
  constructor(readonly struct: Struct<T>) {
    const partialDef: Partial<PartialTypeStruct<T>> = {};
    for(const k of ownKeys(struct.definition)) {
      const v = struct.definition[k];
      if(v instanceof MissingKey || v instanceof OptionalKey) {
        setOwn(partialDef, k, optional(v.type));
      }
      else {
        setOwn(partialDef, k, optional(v));
      }
    }
    const hiddenTypeStruct = partialDef as PartialTypeStruct<T>;
    super({
      fields: objectFields(hiddenTypeStruct),
      exact: struct.exact,
      requirePlainObject: false,
    });
    this.hiddenTypeStruct = hiddenTypeStruct;
  }

  reify(): Struct<PartialTypeStruct<T>> {
    return new Struct(this.hiddenTypeStruct, this.struct.exact);
  }
}


export function deepPartial<T extends TypeStruct>(ogstruct: Struct<T>): PartialStruct<DeepPartialTypeStruct<T>> {
  // If the original struct isn't nested, it's just an ordinary partial call. Don't modify the
  // definition, or else when you convert to TypeScript it won't correctly ref out the struct
  if(!hasNested(ogstruct)) {
    // @ts-ignore
    return partial(ogstruct);
  }

  // If we got this far, the struct has nesting, and therefore can't simply be ref-ed out when
  // converting to TypeScript. We must modify it recursively.
  const partialDef: Partial<DeepPartialTypeStruct<T>> = {};
  for(const k of ownKeys(ogstruct.definition)) {
    const v = ogstruct.definition[k];
    if(v instanceof MissingKey) {
      setOwn(partialDef, k, new MissingKey(v.type));
    }
    else if(v instanceof OptionalKey) {
      setOwn(partialDef, k, optional(v.type));
    }
    else {
      setOwn(partialDef, k, deepPartialKind(asKind(v)));
    }
  }
  const struct = new Struct(partialDef as DeepPartialTypeStruct<T>, ogstruct.exact);
  return new PartialStruct(struct);
}

type ObjectOperand = Dict<any> | Struct<any> | PartialStruct<any>;
type MergeableKind = ObjectOperand | MergeIntersect<any>;

export class MergeIntersect<T> extends MergeableType<T> {
  readonly operands: ReadonlyArray<ObjectOperand>;

  constructor(operands: ReadonlyArray<MergeableKind>) {
    const flattened = operands.reduce<ObjectOperand[]>((all, operand) => {
      return all.concat(mergeOperands(operand));
    }, []);
    super(mergeOperandShapes(flattened));
    this.operands = flattened;
  }
}

function mergeOperands(type: MergeableType<any> & Kind): ObjectOperand[] {
  if(type instanceof MergeIntersect) return type.operands.slice();
  if(type instanceof Dict || type instanceof Struct || type instanceof PartialStruct) return [ type ];
  throw `Unknown mergeable type ${type}`;
}

function mergeOperandShapes(operands: ReadonlyArray<ObjectOperand>): ObjectShape {
  if(operands.length === 0) throw `Can't merge zero object types`;

  let shape = objectShapeOf(operands[0]);
  for(const operand of operands.slice(1)) {
    shape = mergeObjectShapes(shape, objectShapeOf(operand));
  }
  return shape;
}

function objectShapeOf(type: ObjectOperand): ObjectShape {
  if(type instanceof Dict) {
    return {
      fields: emptyObjectFields(),
      exact: false,
      requirePlainObject: true,
      rest: type.valueType,
    };
  }
  if(type instanceof Struct) {
    return {
      fields: objectFields(type.definition),
      exact: type.exact,
      requirePlainObject: false,
    };
  }
  if(type instanceof PartialStruct) {
    const struct = type.reify();
    return {
      fields: objectFields(struct.definition),
      exact: struct.exact,
      requirePlainObject: false,
    };
  }
  throw `Unknown object type ${type}`;
}

function mergeObjectShapes(left: ObjectShape, right: ObjectShape): ObjectShape {
  const fields = emptyObjectFields();

  for(const prop of ownKeys(left.fields)) {
    const leftField = left.fields[prop];
    if(hasOwn(right.fields, prop)) {
      fields[prop] = mergeFields(leftField, right.fields[prop]);
    }
    else if(right.rest) {
      fields[prop] = mergeFieldAndType(leftField, right.rest);
    }
    else {
      fields[prop] = leftField;
    }
  }

  for(const prop of ownKeys(right.fields)) {
    if(hasOwn(left.fields, prop)) continue;

    const rightField = right.fields[prop];
    fields[prop] = left.rest
      ? mergeFieldAndType(rightField, left.rest)
      : rightField;
  }

  const rest = left.rest && right.rest
    ? left.rest.and(right.rest)
    : left.rest || right.rest;

  return {
    fields,
    exact: left.exact && right.exact,
    requirePlainObject: left.requirePlainObject || right.requirePlainObject,
    rest,
  };
}

function mergeFields(left: ObjectField, right: ObjectField): ObjectField {
  return {
    checker: left.checker.and(right.checker),
    allowsMissing: left.allowsMissing && right.allowsMissing,
  };
}

function mergeFieldAndType(field: ObjectField, type: TypedKind<any>): ObjectField {
  return {
    checker: field.checker.and(type),
    allowsMissing: field.allowsMissing,
  };
}

export const Nested = [
  Struct,
  PartialStruct,
  Dict,
  Either,
  Intersection,
  MergeIntersect,
  Comment,
] as const;
export type NestedType = InstanceType<(typeof Nested)[number]>;

function deepPartialKind(kind: Kind): Kind {
  if(isNested(kind)) return handleNested(kind);
  return kind;
}

function handleNested(kind: NestedType): Kind {
  if(kind instanceof Struct) {
    if(hasNested(kind)) return deepPartial(kind);
    return new PartialStruct(kind);
  }
  if(kind instanceof PartialStruct) return deepPartial(kind.struct);
  if(kind instanceof Comment) return new Comment(kind.commentStr, deepPartialKind(kind.wrapped));
  if(kind instanceof Dict) return new Dict(deepPartialKind(kind.valueType), kind.namedKey);
  if(kind instanceof Either) return new Either(deepPartialKind(kind.l), deepPartialKind(kind.r));
  if(kind instanceof Intersection) {
    return new Intersection(kind.operands.map(deepPartialKind));
  }
  return new Intersection(kind.operands.map(deepPartialKind));
}

function isNested(kind: Kind | NestedType): kind is NestedType {
  for(const t of Nested) {
    if(kind instanceof t) return true;
  }
  return false;
}

function hasNested(struct: Struct<any>) {
  for(const k of ownKeys(struct.definition)) {
    if(isNested(struct.definition[k])) return true;
  }
  return false;
}

export function partial<T extends TypeStruct>(struct: Struct<T>): PartialStruct<T> {
  return new PartialStruct(struct);
}
