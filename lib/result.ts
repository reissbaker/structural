export class Err<T> {
  message: string;
  constructor(str: string) {
    this.message = str;
  }
}

export type Result<T> = T | Err<T>;
