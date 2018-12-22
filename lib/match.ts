import { Type } from './type'

class Case<In, Out> {
  type: Type<In>
  fn: (x: In) => Out

  constructor(type: Type<In>, fn: (x: In) => Out) {
    this.type = type
    this.fn = fn
  }
}

type InOfCase<T extends Case<any, any>> = T extends Case<infer In, any> ?
  In : never

type OutOfCase<T extends Case<any, any>> = T extends Case<any, infer Out> ?
  Out : never

export class CaseSwitch<Cases extends Case<any, any>> {
  cases: Cases[]
  private memoAccept: Type<InOfCase<Cases>> | undefined

  constructor(cases: Cases[]) {
    if (cases.length === 0) {
      throw new Error("must have at least one case")
    }
    this.cases = cases
  }

  // implemented lazily because not every CaseSwitch will be used
  get accept(): Type<InOfCase<Cases>> {
    if (this.memoAccept) {
      return this.memoAccept
    }
    const cases = this.cases
    let type = cases[0].type
    for (let i = 1; i < cases.length; i++) {
      type = type.or(cases[i].type)
    }
    this.memoAccept = type
    return this.memoAccept
  }

  run(val: InOfCase<Cases>): OutOfCase<Cases> {
    for (let c of this.cases) {
      if (c.type.guard(val)) {
        return c.fn(val)
      }
    }
    // raise a type error if none of the cases match the value.
    this.accept.assert(val)
    // satisfy return value checking
    throw "unreachable"
  }

  /**
   * Create a new CaseSwitch that also handles the specified case.
   */
  when<In, Out>(type: Type<In>, fn: (v: In) => Out): CaseSwitch<Cases | Case<In, Out>> {
    const c = new Case(type, fn)
    return new CaseSwitch([...this.cases, c])
  }
}

/**
 * Create a type switch that can be used with `match()`.
 */
export function when<In, Out>(type: Type<In>, fn: (v: In) => Out) {
  const c = new Case(type, fn)
  return new CaseSwitch([c])
}

/**
 * Match a value against a type switch created with `when()`.
 *
 * @example
 * const asString = t.match(foo,
 *   t.when(t.array(t.string), xs => xs.join(' and '))
 *    .when(t.string,           s => s))
 *    .when(t.any,              x => '' + x))
 */
// export function match<I, O, Cases extends Case<I, O>>(val: I, cases: CaseSwitch<Cases>): O {
export function match<Cases extends Case<any, any>>(val: InOfCase<Cases>, sw: CaseSwitch<Cases>): OutOfCase<Cases> {
  return sw.run(val)
}
