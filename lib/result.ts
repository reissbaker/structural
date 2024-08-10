export class TypeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class Err<_> {
  message: string;
  constructor(str: string) {
    this.message = str;
  }

  toError() {
    return new TypeError(this.message);
  }
}

export type Result<T> = T | Err<T>;
