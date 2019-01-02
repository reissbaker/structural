import { Type } from './type'
import { inspect } from 'util'
export { inspect }

type tostr = () => string

export const indent = (prefix: string, lines: string | string[]) =>
  (Array.isArray(lines) ? lines : lines.split("\n"))
    .map(line => prefix + line)
    .join("\n")

export const indentNext = (prefix: string, lines: string | string[]) => {
  const [first, ...rest] = Array.isArray(lines) ? lines : lines.split("\n")
  if (rest.length === 0) { return first }
  return [first, ...indent(prefix, rest).split("\n")].join("\n")
}

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

  constructor(msg: string | tostr, {path = [], value, type, causes = []}: {
    path?: PathElement[],
    value: any,
    type: Type<any>,
    causes?: Err<_>[]
  }) {
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

  toError(data: any): StructuralError {
    return new StructuralError(
      this.message,
      {
        data,
        path: this.path,
        value: this.value,
        type: this.type,
        errors: this.causes.map(c => c.toError(data)),
      }
    );
  }

  toStringWithValue() {
    const pathPart = this.path.length ?
      `${pathToString(this.path)}: ` : ''
    const typeString = indentNext('  ', this.type.toString())
    const valString = indentNext('  ', inspect(this.value))
    const message = this.message
   return `${pathPart}expected type \`${typeString}\` but received value \`${valString}\`: ${message}`
 return ``
  }

  toStringNoValue() {
    const typeString = indentNext('  ', this.type.toString())
    return `failed \`${typeString}\`: ${this.message}`
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
      throw new Error(`${this} out of bounds of ${keys} in ${current}`)
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
  readonly data: any           // top-level data
  readonly path: PathElement[] // array defining access to the field in `data`. Will be [] if element is data
  readonly value: any          // The invalid value
  readonly type: Type<any>     // Expected type of value
  readonly errors: StructuralError[] // causes

  constructor(msg: string, { data, path, value, type, errors = []}: Pick<StructuralError, 'data' | 'path' | 'value' | 'type' | 'errors'>) {
    const pathPart = path.length ?
      `At \`${pathToString(path)}\`: ` : ''
    super(
`${pathPart}Expected a value of type \`
  ${indentNext('  ', type.toString())}
\` but received \`
  ${indentNext('  ', inspect(value))}
\` which ${indentNext('  ', msg)}`)
    this.data = data
    this.path = path
    this.value = value
    this.type = type
    this.errors = errors
  }
}

export type Result<T> = T | Err<T>;
