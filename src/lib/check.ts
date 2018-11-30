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

export class Either<L, R> extends Check<L|R> {
  private l: Check<L>;
  private r: Check<R>;
  constructor(l: Check<L>, r: Check<R>) {
    super();
    this.l = l;
    this.r = r;
  }

  check(val: any): Result<L|R> {
    const l = this.l.check(val);
    if(!(l instanceof Err)) return l;
    const r = this.r.check(val);
    if(!(r instanceof Err)) return r;
    return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
  }
}

export class Intersect<L, R> extends Check<L&R> {
  private l: Check<L>;
  private r: Check<R>;

  constructor(l: Check<L>, r: Check<R>) {
    super();
    this.l = l;
    this.r = r;
  }

  check(val: any): Result<L&R> {
    const l = this.l.check(val);
    const r = this.r.check(val);
    if((l instanceof Err) && (r instanceof Err)) {
      return new Err(`${val} failed the following checks:\n${l.message}\n${r.message}`);
    }
    if(l instanceof Err) return l;
    if(r instanceof Err) return r;

    return val as L&R;
  }
}
