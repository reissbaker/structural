import { formatIssue } from "./format-issue";
import type { Issue } from "./issue";

export class TypeError extends Error {
  constructor(readonly issue: Issue, message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class Err<_> {
  readonly message: string;

  constructor(readonly issue: Issue) {
    this.message = formatIssue(issue);
  }

  toError(): TypeError {
    return new TypeError(this.issue, this.message);
  }
}

export type Result<T> = T | Err<T>;
