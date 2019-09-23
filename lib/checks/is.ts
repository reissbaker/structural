import { Result } from "../result";
import { Type } from "../type";

type Guard<T> = (val: any) => val is T

export class Is<T> extends Type<T> {
  readonly name: string
  readonly isT: Guard<T>

  constructor(name: string, guard: Guard<T>) {
    super()
    this.name = name
    this.isT = guard
  }

  check(val: any): Result<T> {
    if(this.isT(val)) return val;
    return this.err(`guard failed`, val)
  }

  toString() {
    return `is(${this.name}, ${this.isT})`
  }
}

export function is<T>(name: string, guard: Guard<T>) {
  return new Is<T>(name, guard)
}
