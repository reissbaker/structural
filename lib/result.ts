import { Type } from './type'
import { inspect } from 'util'
export { inspect }

const MAX_ERR_LINE_LENGTH = 15
const INDENT = '  '

export const indent = (prefix: string, lines: string | string[]) =>
  (Array.isArray(lines) ? lines : lines.split("\n"))
    .map(line => prefix + line)
    .join("\n")

export const indentNext = (prefix: string, lines: string | string[]) => {
  const [first, ...rest] = Array.isArray(lines) ? lines : lines.split("\n")
  if (rest.length === 0) { return first }
  return [first, ...indent(prefix, rest).split("\n")].join("\n")
}

function shouldWrap(msg: string | string[]): boolean {
  const parts = Array.isArray(msg) ? msg : [msg];

  const len = parts.map(s => s.length).reduce((m, x) => m + x, 0)
  if (len > MAX_ERR_LINE_LENGTH) { return true }

  const hasNewline = parts.map(s => s.includes("\n")).reduce((m, x) => m || x)
  return hasNewline
}

function quoteOrIndent(msg: string, suffix?: (inline: boolean) => string): string {
  if (shouldWrap(msg)) {
    return ("\n" +
      indent(INDENT, msg) +
      (msg.endsWith("\n") ? '' : "\n") +
      (suffix ? suffix(false) : ''))
  }
  return '`' + msg + '`' + (suffix ? suffix(true) : '')
}

function subMessage(msg: string): string {
  return indentNext(INDENT, msg)
}

function concat(...msgs: string[]): string {
  const out = []
  for (let i = 0; i<msgs.length; i++) {
    const cur = msgs[i]
    const nxt = msgs[i+1]
    out.push(cur)
    if (!nxt || cur.endsWith("\n") ||  nxt.startsWith("\n")) {
      continue;
    }
    out.push(" ")
  }
  return out.join('')
}

type tostr = () => string

type ErrOpts<_> = {
    value: any,
    type: Type<any>,
    path?: PathElement[],
    causes?: Err<_>[]
}

const errSep = (inline: boolean) => inline ? ':' : 'because:'

export class Err<_> {
  path: PathElement[] // array defining access to the field in `data`. Will be [] if element is data
  value: any          // The invalid value
  type: Type<any>     // Expected type of value
  causes: Err<_>[]
  protected msg: string | tostr;

  static lift<_>(err: Err<_>, ...path: PathElement[]) {
    return new Err<_>(
      err.msg,
      {
        value: err.value,
        type: err.type,
        path: path.concat(err.path),
      }
    )
  }

  // TODO: disallow causes option
  static combine<_>(errs: Err<any>[], opts: ErrOpts<_>): Err<_> {
    return new Err(
      () => {
        if (errs.length === 1) { return errs[0].toString() }
        const errStrings = errs.map((e) => `- ${e}`).join("\n")
        return `failed multiple checks:\n${errStrings}`
      },
      { ...opts, causes: errs },
    )
  }

  constructor(msg: string | tostr, {path = [], value, type, causes = []}: ErrOpts<_>) {
    this.msg = msg
    this.path = path
    this.value = value
    this.type = type
    this.causes = causes
  }

  get message(): string {
    const msg = typeof this.msg === 'function' ?
      this.msg() : this.msg
    this.msg = msg
    return msg
  }

  protected rootCauses(parentPath: PathElement[]): Err<_>[] {
    if (this.causes.length === 0) {
      return [Err.lift(this, ...parentPath)]
    }
    return this.causes
      .map(c => c.rootCauses(parentPath.concat(this.path)))
      .reduce((x, m) => x.concat(m), [])
  }

  toError(): StructuralError {
    // force expanding all errors now so that the lifted errors in rootCauses
    // below are already memoized
    const asString = this.toStringWithValue()

    // flatten causes, which is more inspectable to downstream exception
    // handlers
    const causes = this.causes
      .map(c => c.rootCauses(this.path))
      .reduce((x, m) => x.concat(m), [])

    return new StructuralError(
      asString,
      {
        value: this.value,
        type: this.type,
        causes: causes,
      }
    );
  }

  toStringWithValue() {
    const pathPart = this.path.length ? ['at', `${pathToString(this.path)}:`] : []
    return concat(
      ...pathPart,
      'given value', quoteOrIndent(inspect(this.value)),
      'did not match expected type', quoteOrIndent(this.type.toString(), errSep),
      subMessage(this.message),
    )
  }

  toStringNoValue() {
    return concat(
      'not of type', quoteOrIndent(this.type.toString(), errSep),
      subMessage(this.message),
    )
  }

  // Use this stringifier when embedding an error inside another error's message.
  // Avoids printing the value again for errors that don’t modify the path
  toString() {
    if (this.path.length === 0) { return this.toStringNoValue() }
    return this.toStringWithValue()
  }
}

/**
 * KeyIndex represents a specific key in a map when the key itself is invalid.
 * Consider a map of Map<A, B>. If we assert for a concrete value that is actually
 * a Map<A | number, B>, we can use KeyIndex to indicate that it is the Nth key
 * which is invalid (because it is a number). This is even more useful if the key
 * is a struct, and some deep field of the struct has gone wrong.
 */
export class MapKeyIndex {
  readonly index: number
  constructor(n: number) {
    this.index = n
  }

  toString() {
    return `.keys()[${this.index}]`
  }

  apply(current: any) {
    const keys = Array.from(current.keys())
    if (keys.length <= this.index) {
      throw new Error(`${this} index out of bounds of keys ${keys.length} in ${current}`)
    }
    return keys[this.index]
  }
}

/**
 * For map types, this boxes the key so it's clear we're accessing a map. If we just used `any`
 * in the path, we couldn't be sure when pulling out KeyIndex values what those values meant.
 */
export class MapKey {
  readonly val: any
  constructor(v: any) {
    this.val = v
  }

  toString() {
    return `.get(${this.val.toString()})`
  }

  apply(current: any) {
    return current.get(this.val)
  }
}
type PathElement = string | number | MapKeyIndex | MapKey

// is there any point to this other than intellectual exercise??
export function lookupPath(val: any, path: PathElement[]): any {
  if (path.length === 0) {
    return val
  }

  let current = val
  path.forEach((key) => {
    if (key instanceof MapKeyIndex) {
      current = key.apply(current)
      return
    }
    if (key instanceof MapKey) {
      current = key.apply(current)
      return
    }
    current = current[key]
  })
  return current
}

export function pathToString(lookupPath: PathElement[]): string {
  let out: string[] = []
  for (let i = 0; i<lookupPath.length; i++) {
    const el = lookupPath[i]
    if (typeof el === 'string') {
      out.push(`.${el}`)
      continue
    }
    if (typeof el === 'number') {
      out.push(`[${el}]`)
      continue
    }
    out.push(el.toString())
  }
  return out.join('')
}

export class StructuralError extends Error {
  readonly value: any          // The invalid value
  readonly type: Type<any>     // Expected type of value
  readonly causes: Err<any>[]  // causes

  constructor(msg: string, opts: Pick<StructuralError, 'value' | 'type' | 'causes'>) {

    super(msg)
    // TODO: the above "which" doesn't necessarily make sense in all cases.
    this.value = opts.value
    this.type = opts.type
    this.causes = opts.causes
  }
}

export type Result<T> = T | Err<T>;
