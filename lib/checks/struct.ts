import { Err } from "../result";
import { KeyTrackResult, Type, KeyTrackingType } from "../type";
import { GetType } from "../get-type";

/**
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

export class Struct<T extends TypeStruct> extends KeyTrackingType<UnwrappedTypeStruct<T>> {
  readonly definition: T;
  readonly exact: boolean;

  constructor(definition: T, exact: boolean) {
    super();
    this.definition = definition;
    this.exact = exact;
  }

  checkTrackKeys(val: any): KeyTrackResult<UnwrappedTypeStruct<T>> {
    const typeErr = this.checkType(val);
    if(typeErr) return typeErr;

    const errs = this.checkFields(val);

    if(errs.length === 0) {
      return {
        val: val as UnwrappedTypeStruct<T>,
        knownKeys: Object.keys(this.definition),
        exact: this.exact,
      }
    }

    return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
  }

  private checkType(val: any): Err<UnwrappedTypeStruct<T>> | undefined {
    if(typeof val !== 'object') return new Err(`${val} is not an object`);
    if(Array.isArray(val)) return new Err(`${val} is an array`);
    if(val === null) return new Err(`${val} is null`);
    return undefined;
  }

  private checkFields(val: any): string[] {
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
      if(valField === undefined && allowsOptional(field)) continue;

      const result = keyType(field).check(valField);
      if(result instanceof Err) errs.push(result.message);
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
