import { Type } from './type'

type MapFn<In, Out> = (x: In) => Out

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
      throw new Error("must have at least one ase")
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
    this.accept.assert(val)
    throw "unreachable"
  }

  /**
   * create a new CaseSwitch that also handles the specified case.
   */
  when<In, Out>(type: Type<In>, fn: (v: In) => Out): CaseSwitch<Cases | Case<In, Out>> {
    const c = new Case(type, fn)
    return new CaseSwitch([...this.cases, c])
  }
}

export class Switch<In, Out, Func extends MapFn<any,any>> {
  accept: Type<In>
  arms: Map<Type<In>, Func>

  constructor(type: Type<In>, arms?: Map<Type<In>, Func>) {
    this.accept = type
    this.arms = arms ? new Map(arms) : new Map()
  }

  when<NewIn, NewOut>(type: Type<NewIn>, fn: MapFn<NewIn, NewOut>): Switch<In|NewIn, Out|NewOut, Func|MapFn<NewIn, NewOut>> {
    const result = new Switch<In |NewIn, Out|NewOut, Func|MapFn<NewIn, NewOut>>(this.accept.or(type), this.arms)
    result.arms.set(type, fn)
    return result
  }

  run(val: In): Out {
    for (const [type, fn] of this.arms) {
      if (type.guard(val)) {
        return fn(val)
      }
    }
    // for JS when types are not guaranteed
    this.accept.assert(val)
    throw new Error("unreachable")
  }
}

export function when<In, Out>(type: Type<In>, fn: MapFn<In, Out>) {
  const c = new Case(type, fn)
  return new CaseSwitch([c])
}

/**
 * Usage:
 *
 * const asString = t.match(foo,
 *   t.when(t.array(t.string), xs => xs.join(' and '))
 *    .when(t.string,           s => s))
 *    .when(t.any,              x => '' + x))
 */
// export function match<I, O, Cases extends Case<I, O>>(val: I, cases: CaseSwitch<Cases>): O {
export function match<Cases extends Case<any, any>>(val: InOfCase<Cases>, sw: CaseSwitch<Cases>): OutOfCase<Cases> {
  return sw.run(val)
}
