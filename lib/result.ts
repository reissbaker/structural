export class Err<T> {
  message: string;
  constructor(str: string) {
    this.message = str;
  }

  toError() {
    return new Error(this.message);
  }
}

export type Result<T> = T | Err<T>;
