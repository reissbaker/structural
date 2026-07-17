import { Err, Result } from "../result";
import { asKind } from "../as-kind";
import { Kind, TypedKind } from "../kind";
import { Comment, Either, Intersection, Projection, Type, TypeImpl } from "../type";
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

type ObjectShape = {
  readonly fields: { readonly [key: string]: ObjectField };
  readonly exact: boolean;
  readonly rest?: TypedKind<any>;
};

abstract class MergeableType<T> extends TypeImpl<T> {
  constructor(protected readonly objectShape: ObjectShape) {
    super();
  }

  check(val: any): Result<T> {
    const typeErr = basicObjectErr(val);
    if(typeErr) return typeErr;

    const errs: string[] = [];
    for(const prop in this.objectShape.fields) {
      const field = this.objectShape.fields[prop];
      if(!(prop in val)) {
        if(field.allowsMissing) continue;
        errs.push(`missing key '${prop}'`);
        continue;
      }

      const result = field.checker.check(val[prop]);
      if(result instanceof Err) errs.push(result.message);
    }

    for(const prop in val) {
      if(prop in this.objectShape.fields) continue;

      if(this.objectShape.rest) {
        const result = this.objectShape.rest.check(val[prop]);
        if(result instanceof Err) errs.push(`[${prop}]: ${result.message}`);
      }
      else if(this.objectShape.exact) {
        errs.push(`unknown key ${prop}`);
      }
    }

    if(errs.length === 0) return val as T;
    return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
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
    for(const prop in this.objectShape.fields) {
      if(!(prop in val)) continue;

      const field = this.objectShape.fields[prop];
      const value = val[prop];
      const projection = this.projectionOf(field.checker, value);
      result[prop] = projection.kind === "none" ? value : projection.value;
    }

    if(this.objectShape.rest) {
      for(const prop in val) {
        if(prop in this.objectShape.fields) continue;

        const value = val[prop];
        const projection = this.projectionOf(this.objectShape.rest, value);
        result[prop] = projection.kind === "none" ? value : projection.value;
      }
    }

    return { kind: "structural", value: result as T };
  }
}

// Dicts and structs merge together in TypeScript, so we put both in the struct file
export class Dict<V> extends MergeableType<RawDict<V>> {
  readonly valueType: TypedKind<V>;
  constructor(v: TypedKind<V>, readonly namedKey: string = "key") {
    super({ fields: {}, exact: false, rest: v });
    this.valueType = v;
  }

  keyName(key: string): Dict<V> {
    return new Dict(this.valueType, key);
  }
}

function basicObjectErr<V>(val: any): Err<V> | undefined {
  if(typeof val !== 'object') return new Err(`${val} is not an object`);
  if(Array.isArray(val)) return new Err(`${val} is an array`);
  if(val === null) return new Err(`${val} is null`);
  return undefined;
}

export function dict<V>(v: TypedKind<V>): Dict<V> {
  return new Dict(v);
}

export type FieldDef = Kind | MissingKey<any> | OptionalKey<any>;

export type TypeStruct = {
  [key: string]: FieldDef
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
  [K in keyof T]: TypedKind<T[K]>;
};

export type StructFor<T> = Struct<TypeStructFor<T>>;

export function keyType<T>(box: MissingKey<TypedKind<T>> | OptionalKey<TypedKind<T>> | TypedKind<T>): TypedKind<T> {
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
  const fields: { [key: string]: ObjectField } = {};
  for(const prop in definition) {
    const field = definition[prop];
    fields[prop] = {
      checker: field instanceof OptionalKey
        ? undef.or(field.type)
        : keyType(field),
      allowsMissing: field instanceof MissingKey || field instanceof OptionalKey,
    };
  }
  return fields;
}

export class Struct<T extends TypeStruct> extends MergeableType<UnwrappedTypeStruct<T>> {
  readonly definition: T;
  readonly exact: boolean;

  constructor(definition: T, exact: boolean) {
    super({ fields: objectFields(definition), exact });
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

export function optional<T extends Kind>(check: T): OptionalKey<T> {
  return new OptionalKey(check);
}

export function allowMissing<T extends Kind>(check: T): MissingKey<T> {
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
    for(const k in struct.definition) {
      const v = struct.definition[k];
      if(v instanceof MissingKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type);
      }
      else if(v instanceof OptionalKey) {
        //@ts-ignore
        partialDef[k] = optional(v.type);
      }
      else {
        //@ts-ignore
        partialDef[k] = optional(v);
      }
    }
    const hiddenTypeStruct = partialDef as PartialTypeStruct<T>;
    super({ fields: objectFields(hiddenTypeStruct), exact: struct.exact });
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
  for(const k in ogstruct.definition) {
    const v = ogstruct.definition[k];
    if(v instanceof MissingKey) {
      //@ts-ignore
      partialDef[k] = new MissingKey(v.type);
    }
    else if(v instanceof OptionalKey) {
      //@ts-ignore
      partialDef[k] = optional(v.type);
    }
    else {
      const deepKind = deepPartialKind(v);
      // @ts-ignore
      partialDef[k] = deepKind;
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
  if(type instanceof Dict) return { fields: {}, exact: false, rest: type.valueType };
  if(type instanceof Struct) return { fields: objectFields(type.definition), exact: type.exact };
  if(type instanceof PartialStruct) {
    const struct = type.reify();
    return { fields: objectFields(struct.definition), exact: struct.exact };
  }
  throw `Unknown object type ${type}`;
}

function mergeObjectShapes(left: ObjectShape, right: ObjectShape): ObjectShape {
  const fields: { [key: string]: ObjectField } = {};

  for(const prop in left.fields) {
    const leftField = left.fields[prop];
    if(prop in right.fields) {
      fields[prop] = mergeFields(leftField, right.fields[prop]);
    }
    else if(right.rest) {
      fields[prop] = mergeFieldAndType(leftField, right.rest);
    }
    else {
      fields[prop] = leftField;
    }
  }

  for(const prop in right.fields) {
    if(prop in left.fields) continue;

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
  for(const k in struct.definition) {
    if(isNested(struct.definition[k])) return true;
  }
  return false;
}

export function partial<T extends TypeStruct>(struct: Struct<T>): PartialStruct<T> {
  return new PartialStruct(struct);
}
