import { Err, Result } from "../result";
import { Type, CustomCommutativeAndType, Either, DefaultIntersect } from "../type";
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
    if(m instanceof Dict) return this.mergeDicts(d, m);
    if(m instanceof Struct) return this.mergeDictAndStruct(d, m);
    if(m instanceof MergeIntersect) return this.mergeDictAndMergeable(d, m.merged);
    if(m instanceof InternalDictStructMerge) return this.mergeInternalAndDict(m, d);
    throw `Unknown type for ${m}`;
  }

  private mergeStructAndMergeable(
    s: Struct<any>,
    m: MergeableType<any> | InternalDictStructMerge<any, any, any, any>
  ): MergeableType<any> | InternalDictStructMerge<any, any, any, any> {
    if(m instanceof Dict) return this.mergeDictAndStruct(m, s);
    if(m instanceof Struct) return this.mergeStructs(s, m);
    if(m instanceof MergeIntersect) return this.mergeStructAndMergeable(s, m.merged);
    if(m instanceof InternalDictStructMerge) return this.mergeInternalAndStruct(m, s);
    throw `Unknown type for ${m}`;
  }

  private mergeIntersectAndMergeable(
    i: MergeIntersect<any, any, any, any>,
    m: MergeableType<any> | InternalDictStructMerge<any, any, any, any>
  ): MergeableType<any> | InternalDictStructMerge<any, any, any, any> {
    if(m instanceof Dict) return this.mergeDictAndMergeable(m, i.merged);
    if(m instanceof Struct) return this.mergeStructAndMergeable(m, i.merged);
    if(m instanceof MergeIntersect) return this.mergeIntersectAndMergeable(m, i.merged);
    if(m instanceof InternalDictStructMerge) return this.mergeInternalAndIntersect(m, i);
    throw `Unknown type for ${m}`;
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
  ) {
    const merged = r.merged;
    if(merged instanceof Dict) return this.mergeInternalAndDict(l, merged);
    if(merged instanceof Struct) return this.mergeInternalAndStruct(l, merged);
    if(merged instanceof InternalDictStructMerge) return this.mergeInternalAndInternal(l, merged);
    throw `Unknown type for ${merged}`;
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

  private mergeStructs(l: StructFor<L>, r: StructFor<R>) {
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
