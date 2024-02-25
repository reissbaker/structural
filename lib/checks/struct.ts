import { Err, Result } from "../result";
import { Type, CustomCommutativeAndType, Either, DefaultIntersect, Comment } from "../type";
import { GetType } from "../get-type";

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

abstract class MergeableType<T> extends CustomCommutativeAndType<T> {
  and<Incoming>(type: Type<Incoming>): Type<T & Incoming> {
    if(type instanceof MergeableType) {
      // @ts-ignore
      return new MergeIntersect(this, type);
    }
    else if(type instanceof Either) {
      return new Either(
        this.and(type.l),
        this.and(type.r),
      );
    }
    else if(type instanceof DefaultIntersect) {
      return new DefaultIntersect(
        this.and(type.l),
        this.and(type.r),
      );
    }
    else if(type instanceof Comment) {
      return new Comment(type.commentStr, this.and(type.wrapped));
    }
    return super.and(type);
  }
}

// Dicts and structs merge together in TypeScript, so we put both in the struct file
export class Dict<V> extends MergeableType<RawDict<V>> {
  readonly valueType: Type<V>;
  constructor(v: Type<V>, readonly namedKey: string = "key") {
    super();
    this.valueType = v;
  }

  keyName(key: string): Dict<V> {
    return new Dict(this.valueType, key);
  }

  check(val: any): Result<RawDict<V>> {
    const err = basicDictErrs(val);
    if(err) return err;

    for(const prop in val) {
      const result = this.valueType.check(val[prop]);
      if(result instanceof Err) return new Err(`[${prop}]: ${result.message}`);
    }

    return val as Result<RawDict<V>>;
  }

  sliceResult(val: any): Result<RawDict<V>> {
    const err = basicDictErrs(val);
    if(err) return err;

    const result: { [key: string]: any } = {};
    for(const prop in val) {
      const sliced = this.valueType.sliceResult(val[prop]);
      if(sliced instanceof Err) return new Err(`[${prop}]: ${result.message}`);
      result[prop] = sliced;
    }

    return result as Result<RawDict<V>>;
  }
}

function basicDictErrs<V>(val: any): Err<V> | null {
  if(typeof val !== 'object') return new Err(`${val} is not an object`);
  if(Array.isArray(val)) return new Err(`${val} is an array`);
  if(val === null) return new Err(`${val} is null`);
  return null;
}

export function dict<V>(v: Type<V>): Dict<V> {
  return new Dict(v);
}

export type FieldDef = Type<any> | MissingKey<any> | OptionalKey<any>;

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
  [K in keyof T]: Type<T[K]>;
};

export type StructFor<T> = Struct<TypeStructFor<T>>;

export function keyType<T>(box: MissingKey<Type<T>> | OptionalKey<Type<T>> | Type<T>): Type<T> {
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

export class Struct<T extends TypeStruct> extends MergeableType<UnwrappedTypeStruct<T>> {
  readonly definition: T;
  readonly exact: boolean;

  constructor(definition: T, exact: boolean) {
    super();
    this.definition = definition;
    this.exact = exact;
  }

  check(val: any): Result<UnwrappedTypeStruct<T>> {
    const typeErr = this.checkType(val);
    if(typeErr) return typeErr;

    const errs = this.checkFields(val, (t, val) => t.check(val));

    if(errs.length === 0) return val as UnwrappedTypeStruct<T>;
    return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
  }

  sliceResult(val: any): Result<UnwrappedTypeStruct<T>> {
    const typeErr = this.checkType(val);
    if(typeErr) return typeErr;
    const sliced: { [key: string]: any } = {};

    const errs = this.checkFields(val, (t, val) => t.sliceResult(val), (key, val) => {
      sliced[key] = val;
    });

    if(errs.length === 0) return sliced as UnwrappedTypeStruct<T>;
    return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
  }

  private checkType(val: any): Err<UnwrappedTypeStruct<T>> | undefined {
    if(typeof val !== 'object') return new Err(`${val} is not an object`);
    if(Array.isArray(val)) return new Err(`${val} is an array`);
    if(val === null) return new Err(`${val} is null`);
    return undefined;
  }

  private checkFields(val: any, checkFn: (t: Type<any>, val: any) => Result<any>, collect?: (key: string, val: any) => any): string[] {
    const errs: string[] = [];
    for(const prop in this.definition) {
      const field = this.definition[prop]
      if(!(prop in val)) {
        if(allowsMissing(field)) continue;
        if(allowsOptional(field)) continue;

        errs.push(`missing key '${prop}'`);
        continue;
      }

      const valField = val[prop];
      if(valField === undefined && allowsOptional(field)) {
        if(collect) collect(prop, undefined);
        continue;
      }

      const result = checkFn(keyType(field), valField);
      if(result instanceof Err) errs.push(result.message);
      if(collect) collect(prop, result);
    }

    if(this.exact && typeof val === 'object') {
      for(const prop in val) {
        if(!(prop in this.definition)) {
          errs.push(`unknown key ${prop}`);
        }
      }
    }

    return errs;
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
  private readonly hiddenStruct: Struct<PartialTypeStruct<T>>;
  private readonly hiddenTypeStruct: PartialTypeStruct<T>;
  constructor(readonly struct: Struct<T>) {
    super();
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
    this.hiddenTypeStruct = partialDef as PartialTypeStruct<T>;
    this.hiddenStruct = new Struct(this.hiddenTypeStruct, struct.exact);
  }
  check(val: any): Result<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
    return this.hiddenStruct.check(val);
  }
  sliceResult(val: any): Result<UnwrappedTypeStruct<PartialTypeStruct<T>>> {
    return this.hiddenStruct.sliceResult(val);
  }

  reify(): Struct<PartialTypeStruct<T>> {
    return new Struct(this.hiddenTypeStruct, this.hiddenStruct.exact);
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

export class MergeIntersect<
  LVal, RVal,
  L extends MergeableType<LVal>,
  R extends MergeableType<RVal>,
> extends MergeableType<LVal & RVal> {

  // DANGER: NEVER EVER LEAK THIS OBJECT
  // This is for internal use only. Do not use its .and function. Do not pass it to other .and or
  // .or functions. Do not use it AT ALL except to call .check or .sliceResult on it. It MAY be a
  // secret internal class called InternalDictStructMerge (defined below) that does not play well
  // with other types or type algebra.
  protected readonly merged: Type<LVal & RVal>;

  constructor(readonly l: L, readonly r: R) {
    super();

    if(l instanceof Dict) {
      this.merged = this.mergeDictAndMergeable(l, r);
    }
    else if(l instanceof Struct) {
      this.merged = this.mergeStructAndMergeable(l, r);
    }
    else {
      // @ts-ignore
      this.merged = this.mergeIntersectAndMergeable(l, r);
    }
  }

  check(val: any) {
    return this.merged.check(val);
  }

  sliceResult(val: any) {
    return this.merged.sliceResult(val);
  }

  private mergeDictAndMergeable(
    d: Dict<any>,
    m: MergeableType<any> | InternalDictStructMerge<any, any, any, any>
  ): MergeableType<any> | InternalDictStructMerge<any, any, any, any> {
    return merge(m, {
      dict: (m) => this.mergeDicts(d, m),
      partial: (m) => new InternalDictStructMerge(m.reify(), d),
      struct: (m) => this.mergeDictAndStruct(d, m),
      merge: (m) => this.mergeDictAndMergeable(d, m.merged),
      internal: (m) => this.mergeInternalAndDict(m, d),
    });
  }

  private mergeStructAndMergeable(
    s: Struct<any>,
    m: MergeableType<any> | InternalDictStructMerge<any, any, any, any>
  ): MergeableType<any> | InternalDictStructMerge<any, any, any, any> {
    return merge(m, {
      dict: m => this.mergeDictAndStruct(m, s),
      partial: m => this.mergeStructs(s, m.reify()),
      struct: m => this.mergeStructs(s, m),
      merge: m => this.mergeStructAndMergeable(s, m.merged),
      internal: m => this.mergeInternalAndStruct(m, s),
    });
  }

  private mergePartialAndMergeable(
    p: PartialStruct<any>,
    m: MergeableType<any> | InternalDictStructMerge<any, any, any, any>,
  ): MergeableType<any> | InternalDictStructMerge<any, any, any, any> {
    return merge(m, {
      dict: m => new InternalDictStructMerge(p.reify(), m),
      partial: m => this.mergeStructs(p.reify(), m.reify()),
      struct: m => this.mergeStructs(p.reify(), m),
      merge: m => this.mergePartialAndMergeable(p, m.merged),
      internal: m => this.mergeInternalAndStruct(m, p.reify()),
    });
  }

  private mergeIntersectAndMergeable(
    i: MergeIntersect<any, any, any, any>,
    m: MergeableType<any> | InternalDictStructMerge<any, any, any, any>
  ): MergeableType<any> | InternalDictStructMerge<any, any, any, any> {
    return merge(m, {
      dict: m => this.mergeDictAndMergeable(m, i.merged),
      partial: m => this.mergePartialAndMergeable(m, i.merged),
      struct: m => this.mergeStructAndMergeable(m, i.merged),
      merge: m => this.mergeIntersectAndMergeable(m, i.merged),
      internal: m => this.mergeInternalAndIntersect(m, i),
    });
  }

  private mergeInternalAndDict(l: InternalDictStructMerge<any, any, any, any>, r: Dict<any>) {
    return new InternalDictStructMerge(l.s, this.mergeDicts(l.d, r));
  }

  private mergeInternalAndStruct(l: InternalDictStructMerge<any, any, any, any>, r: Struct<any>) {
    return new InternalDictStructMerge(this.mergeStructs(l.s, r), l.d);
  }

  private mergeInternalAndIntersect(
    l: InternalDictStructMerge<any, any, any, any>,
    r: MergeIntersect<any, any, any, any>
  ): MergeableType<any> | InternalDictStructMerge<any, any, any, any> {
    return merge(r.merged, {
      dict: merged => this.mergeInternalAndDict(l, merged),
      partial: merged => this.mergeInternalAndStruct(l, merged.reify()),
      struct: merged => this.mergeInternalAndStruct(l, merged),
      merge: () => {
        throw `MergeIntersect can't be a child of a MergeIntersect; structural internal error`
      },
      internal: merged => this.mergeInternalAndInternal(l, merged),
    });
  }

  private mergeInternalAndInternal(
    l: InternalDictStructMerge<any, any, any, any>,
    r: InternalDictStructMerge<any, any, any, any>,
  ) {
    return new InternalDictStructMerge(
      this.mergeStructs(l.s, r.s),
      this.mergeDicts(l.d, r.d),
    )
  }

  private mergeDicts(l: Dict<L>, r: Dict<R>): Dict<L & R> {
    return dict(l.valueType.and(r.valueType));
  }

  private mergeDictAndStruct(l: Dict<L>, r: StructFor<R>) {
    return new InternalDictStructMerge(r, l);
  }

  private mergeStructs(l: Struct<any>, r: Struct<any>) {
    const definition: { [key: string]: FieldDef } = {};

    for(const prop in l.definition) {
      definition[prop] = l.definition[prop];
    }
    for(const prop in r.definition) {
      const existing = definition[prop];
      const merging = r.definition[prop];
      // If it's an additional key, slap it in
      if(existing == null) definition[prop] = r.definition[prop];
      // If it's a missing key, handle
      else if(existing instanceof MissingKey) {
        // Missing keys are stricter than optional, so both converge to missing key
        if(merging instanceof MissingKey || merging instanceof OptionalKey) {
          definition[prop] = new MissingKey(existing.type.and(merging.type));
        }
        // The strictest is just a raw type, so unwrap and merge
        else {
          definition[prop] = existing.type.and(merging);
        }
      }
      // If it's an optional key, handle
      else if(existing instanceof OptionalKey) {
        // Missing key is stricter than optional, so it wins
        if(merging instanceof MissingKey) {
          definition[prop] = new MissingKey(existing.type.and(merging.type));
        }
        // Two optionals merge into an optional
        else if(merging instanceof OptionalKey) {
          definition[prop] = new OptionalKey(existing.type.and(merging.type));
        }
        // A raw type is stricter than optional, so it unwraps the optionality
        else {
          definition[prop] = existing.type.and(merging);
        }
      }
      else {
        // Raw types are stricter than missing or optional types
        if(merging instanceof MissingKey || merging instanceof OptionalKey) {
          definition[prop] = existing.and(merging.type);
        }
        // Finally, merging two raw types
        else {
          definition[prop] = existing.and(merging);
        }
      }
    }

    return new Struct(definition, l.exact && r.exact);
  }
}

type MergeHandlers = {
    dict: (d: Dict<any>) => MergeResult,
    partial: (p: PartialStruct<any>) => MergeResult,
    struct: (s: Struct<any>) => MergeResult,
    merge: (m: MergeIntersect<any, any, any, any>) => MergeResult,
    internal: (i: InternalDictStructMerge<any, any, any, any>) => MergeResult,
};
type MergeResult = MergeableType<any> | InternalDictStructMerge<any, any, any, any>;
function merge<Input extends MergeableType<any>>(
  i: Input,
  handlers: MergeHandlers,
): MergeResult {
  if(i instanceof Dict) return handlers.dict(i);
  if(i instanceof PartialStruct) return handlers.partial(i);
  if(i instanceof Struct) return handlers.struct(i);
  if(i instanceof MergeIntersect) return handlers.merge(i);
  if(i instanceof InternalDictStructMerge) return handlers.internal(i);
  throw `Unknown type ${i}`;
}

class InternalDictStructMerge<
  SVal extends TypeStruct, DVal,
  S extends Struct<SVal>,
  D extends Dict<DVal>
> extends Type<GetType<S> & GetType<D>> {
  readonly s: S;
  constructor(s: S, readonly d: D) {
    super();
    this.s = new Struct(s.definition, false) as S;
  }

  check(val: any) {
    const dResult = this.d.check(val);
    if(dResult instanceof Err) return dResult;
    const sResult = this.s.check(val);
    if(sResult instanceof Err) return sResult;
    return val;
  }

  sliceResult(val: any) {
    const dResult = this.d.sliceResult(val);
    if(dResult instanceof Err) return dResult;
    const sResult = this.s.sliceResult(val);
    return Object.assign({}, dResult, sResult) as GetType<S> & GetType<D>;
  }
}

export const Nested = [
  Struct,
  PartialStruct,
  Dict,
  Either,
  DefaultIntersect,
  MergeIntersect,
  Comment,
] as const;
export type NestedType = InstanceType<(typeof Nested)[number]>;

function deepPartialKind(kind: Type<any>): Type<any> {
  if(isNested(kind)) return handleNested(kind);
  return kind;
}

function handleNested(kind: NestedType): Type<any> {
  if(kind instanceof Struct) {
    if(hasNested(kind)) return deepPartial(kind);
    return new PartialStruct(kind);
  }
  if(kind instanceof PartialStruct) return deepPartial(kind.struct);
  if(kind instanceof Comment) return new Comment(kind.commentStr, deepPartialKind(kind.wrapped));
  if(kind instanceof Dict) return new Dict(deepPartialKind(kind.valueType), kind.namedKey);
  if(kind instanceof Either) return new Either(deepPartialKind(kind.l), deepPartialKind(kind.r));
  if(kind instanceof MergeIntersect) return new DefaultIntersect(deepPartialKind(kind.l), deepPartialKind(kind.r));
  return new DefaultIntersect(deepPartialKind(kind.l), deepPartialKind(kind.r));
}

function isNested(kind: Type<any> | NestedType): kind is NestedType {
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
