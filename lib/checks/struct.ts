import { Err } from "../result";
import { InexactCheckReturnType, Type, ExactType } from "../type";
import { GetType } from "../get-type";

type TypeStruct = {
  [key: string]: Type<any>;
};

type UnwrappedTypeStruct<T extends TypeStruct> = {
  [P in keyof T]: GetType<T[P]>;
};

export class Struct<T extends TypeStruct> extends ExactType<UnwrappedTypeStruct<T>> {
  private definition: T;
  private exact: boolean;

  constructor(definition: T, exact: boolean) {
    super();
    this.definition = definition;
    this.exact = exact;
  }

  inexactCheck(val: any): InexactCheckReturnType<UnwrappedTypeStruct<T>> {
    const typeErr = this.checkType(val);
    if(typeErr) return typeErr;

    const errs = this.checkFields(val);

    if(errs.length === 0) {
      return {
        val: val as UnwrappedTypeStruct<T>,
        allowedKeys: Object.keys(this.definition),
        exact: this.exact,
      }
    }

    return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
  }

  private checkType(val: any): Err<UnwrappedTypeStruct<T>> | undefined {
    if(typeof val !== 'object') return new Err(`${val} is not an object`);
    if(Array.isArray(val)) return new Err(`${val} is an array`);
    if(val === null) return new Err(`${val} is null`);
  }

  private checkFields(val: any): string[] {
    const errs: string[] = [];
    for(const prop in this.definition) {
      const result = this.definition[prop].check(val[prop]);
      if(result instanceof Err) errs.push(result.message);
    }

    return errs;
  }
}

type HiddenStruct<T extends TypeStruct> = Type<UnwrappedTypeStruct<T>>;

export function subtype<T extends TypeStruct>(def: T): HiddenStruct<T> {
  return new Struct(def, false);
}

export function exact<T extends TypeStruct>(def: T): HiddenStruct<T> {
  return new Struct(def, true);
}
