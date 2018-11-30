import { Err, Result } from "../result";
import { Check } from "../check";
import GetType from "../get-type";

type CheckStruct = {
  [key: string]: Check<any>;
};

type UnwrappedCheckStruct<T extends CheckStruct> = {
  [P in keyof T]: GetType<T[P]>;
};

export class Struct<T extends CheckStruct> extends Check<UnwrappedCheckStruct<T>> {
  private definition: T;
  private exact: boolean;

  constructor(definition: T, exact: boolean) {
    super();
    this.definition = definition;
    this.exact = exact;
  }

  check(val: any): Result<UnwrappedCheckStruct<T>> {
    if(typeof val !== 'object') return new Err(`${val} is not an object`);
    if(Array.isArray(val)) return new Err(`${val} is an array`);
    if(val === null) return new Err(`${val} is null`);

    const errs: string[] = [];
    for(const prop in this.definition) {
      if(val.hasOwnProperty(prop)) {
        const result = this.definition[prop].check(val[prop]);
        if(result instanceof Err) errs.push(result.message);
      }
      else {
        errs.push(`Missing key ${prop} in ${val}`);
      }
    }

    if(this.exact) {
      for(const prop in val) {
        if(!this.definition.hasOwnProperty(prop)) {
          errs.push(`Unknown key ${prop} in ${val}`);
        }
      }
    }

    if(errs.length === 0) return val as UnwrappedCheckStruct<T>;
    return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
  }
}

export function subtype<T extends CheckStruct>(def: T): Struct<T> {
  return new Struct(def, false);
}

export function exact<T extends CheckStruct>(def: T): Struct<T> {
  return new Struct(def, true);
}
