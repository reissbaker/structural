import type { InstanceOfIssue } from "./checks/instance-of";
import type { GuardIssue } from "./checks/is";
import type { NeverIssue } from "./checks/never";
import type { MissingIssue, UnknownPropertiesIssue } from "./checks/struct";
import type { LiteralIssue } from "./checks/value";
import type { RuntimeType, TypeMismatchIssue } from "./issues/shared";
import type { ValidationIssue } from "./type";

export type LeafIssue =
  | TypeMismatchIssue
  | LiteralIssue
  | InstanceOfIssue
  | GuardIssue
  | ValidationIssue
  | MissingIssue
  | UnknownPropertiesIssue
  | NeverIssue;

export type PathSegment =
  | { readonly kind: "property", readonly key: string | symbol }
  | { readonly kind: "array-element", readonly index: number }
  | { readonly kind: "dictionary-value", readonly index: number }
  | { readonly kind: "map-key", readonly index: number }
  | { readonly kind: "map-value", readonly index: number }
  | { readonly kind: "set-value", readonly index: number };

export type AtIssue = {
  readonly kind: "at";
  readonly subject: RuntimeType;
  readonly path: ReadonlyArray<PathSegment>;
  readonly issue: Issue;
};

export type MultipleIssue = {
  readonly kind: "multiple";
  readonly subject: RuntimeType;
  readonly issues: ReadonlyArray<Issue>;
};

export type UnionIssue = {
  readonly kind: "union";
  readonly subject: RuntimeType;
  readonly issues: ReadonlyArray<Issue>;
};

export type Issue = LeafIssue | AtIssue | MultipleIssue | UnionIssue;

export function at(segment: PathSegment, issue: Issue, subject: RuntimeType): AtIssue {
  if(issue.kind === "at") {
    return {
      kind: "at",
      subject,
      path: [ segment, ...issue.path ],
      issue: issue.issue,
    };
  }

  return { kind: "at", subject, path: [ segment ], issue };
}

export function multiple(issues: ReadonlyArray<Issue>, subject: RuntimeType): Issue {
  const flattened: Issue[] = [];
  for(const issue of issues) {
    if(issue.kind === "multiple") flattened.push(...issue.issues);
    else flattened.push(issue);
  }

  if(flattened.length === 1) return flattened[0];
  return { kind: "multiple", subject, issues: flattened };
}

export function union(issues: ReadonlyArray<Issue>, subject: RuntimeType): UnionIssue {
  const flattened: Issue[] = [];
  for(const issue of issues) {
    if(issue.kind === "union") flattened.push(...issue.issues);
    else flattened.push(issue);
  }

  return { kind: "union", subject, issues: flattened };
}
