import { Err } from "../result";
import { KeyTrackResult, Type, KeyTrackingType } from "../type";
import { GetType } from "../get-type";
const util = require('util')

/**
 * OptionalKey is a marker type that indicates that the key in a struct that
 * holds an OptionalKey is optional.
 */
export class OptionalKey<T extends Type<any>> {
  type: T

  constructor(type: T) {
    this.type = type
  }
}

type OptionalOrType<T> = T extends OptionalKey<infer Inner> ? Inner : T;

type TypeStruct = {
  [key: string]: Type<any> | OptionalKey<any>;
};

// see this blog post for an explanation of this type shenanigans
// https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html

// Returns a type like `"foo" | "bar"` for all the optional keys in a typestruct
type OptionalPropertyNames<T extends TypeStruct> = {
  [K in keyof T]: T[K] extends OptionalKey<any> ? K : never;
}[keyof T];

// Unwraps Type<T> and OptionalKey<Type<T>> to T for all keys in a typestruct
type UnwrapTypes<T extends TypeStruct> = {
  [K in keyof T]: GetType<OptionalOrType<T[K]>>;
};

export type UnwrappedTypeStruct<T extends TypeStruct> =
  /* required props */ Pick<UnwrapTypes<T>, Exclude<keyof T, OptionalPropertyNames<T>>> &
  /* optional props */ Partial<Pick<UnwrapTypes<T>, OptionalPropertyNames<T>>>;

export function keyType<T>(box: OptionalKey<Type<T>> | Type<T>): Type<T> {
  if (box instanceof OptionalKey) {
    return box.type;
  }
  return box;
}

export function isOptional<T extends Type<any>>(box: OptionalKey<T> | T): box is OptionalKey<T> {
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

    return new Err(`${util.inspect(val)} failed the following checks:\n${errs.join('\n')}`);
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
      if (!(prop in val)) {
        if (isOptional(field)) {
          continue;
        }

        errs.push(`missing key '${prop}'`);
        continue;
      }

      const result = keyType(field).check(val[prop]);
      if(result instanceof Err) errs.push(result.message);
    }

    return errs;
  }

  toString() {
    const kvs: string[] = []
    Object.keys(this.definition).forEach(key => {
      const value = this.definition[key]
      const keystr = isOptional(value) ? `${key}?: ` : `${key}: `
      const valstr = keyType(value).toString()
      kvs.push(keystr + valstr)
    })
    return '{ ' + kvs.join(', ') + ' }'
  }
}

type HiddenStruct<T extends TypeStruct> = Type<UnwrappedTypeStruct<T>>;

export function subtype<T extends TypeStruct>(def: T): HiddenStruct<T> {
  return new Struct(def, false);
}

export function exact<T extends TypeStruct>(def: T): HiddenStruct<T> {
  return new Struct(def, true);
}

export function optional<T extends Type<any>>(check: T): OptionalKey<T> {
  return new OptionalKey(check);
}
