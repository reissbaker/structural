import { Err, Result } from "./result";

export abstract class Check<T> {
  abstract check(val: any): Result<T>;

  assert(val: any): T {
    const result = this.check(val);
    if(result instanceof Err) throw new Error(result.message);
    return result;
  }

  and<R>(r: Check<R>): Check<T&R> {
    return new Intersect(this, r);
  }

  or<R>(r: Check<R>): Check<T|R> {
    return new Either(this, r);
  }
}

export type InexactCheckReturnType<T> = Err<T> | {
  val: T;
  allowedKeys: string[];
  exact: boolean;
}

export abstract class ExactCheck<T> extends Check<T> {
  check(val: any): Result<T> {
    const result = this.inexactCheck(val);
    if(result instanceof Err) return result;

    if(result.exact) {
      const errs = [];
      const allowed = new Set(result.allowedKeys);
      for(const prop in val) {
        if(!allowed.has(prop)) {
          errs.push(`Unknown key ${prop} in ${val}`);
        }
      }

      if(errs.length !== 0) {
        return new Err(`${val} failed the following checks:\n${errs.join('\n')}`);
      }
    }

    return result.val;
  }

  abstract inexactCheck(val: any): InexactCheckReturnType<T>;
}

export class Either<L, R> extends ExactCheck<L|R> {
  private l: Check<L>;
  private r: Check<R>;

  constructor(l: Check<L>, r: Check<R>) {
    super();
    this.l = l;
    this.r = r;
  }

  inexactCheck(val: any): InexactCheckReturnType<L|R> {
    const l = inexactCheck(this.l, val);
    if(!(l instanceof Err)) return l;
    const r = inexactCheck(this.r, val);
    if(!(r instanceof Err)) return r;
    return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
  }
}

export class Intersect<L, R> extends ExactCheck<L&R> {
  private l: Check<L>;
  private r: Check<R>;

  constructor(l: Check<L>, r: Check<R>) {
    super();

    this.l = l;
    this.r = r;
  }

  inexactCheck(val: any): InexactCheckReturnType<L&R> {
    const l = inexactCheck(this.l, val);
    const r = inexactCheck(this.r, val);

    if((l instanceof Err) && (r instanceof Err)) {
      return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
    }
    if(l instanceof Err) return l;
    if(r instanceof Err) return r;

    return {
      val: val as L&R,
      allowedKeys: l.allowedKeys.concat(r.allowedKeys),
      exact: l.exact && r.exact,
    }
  }
}

function inexactCheck<T>(check: Check<T>, val: any): InexactCheckReturnType<T> {
  if(check instanceof ExactCheck) {
    return check.inexactCheck(val);
  }

  const result = check.check(val);
  if(result instanceof Err) return result;

  return {
    val: result,
    allowedKeys: [],
    exact: false,
  };
}
