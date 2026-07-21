import type { Issue, PathSegment } from "./issue";
import type {
  ExpectedType,
  LiteralExpectation,
  RuntimeType,
} from "./issues/shared";

export type FormatErrorOptions = {
  readonly maxNestedErrors?: number;
};

export function formatIssue(issue: Issue, options: FormatErrorOptions = {}): string {
  const maxNestedErrors = options.maxNestedErrors === undefined
    ? Infinity
    : options.maxNestedErrors;
  validateMaxNestedErrors(maxNestedErrors);
  return format(issue, [], maxNestedErrors, false);
}

function format(
  issue: Issue,
  path: ReadonlyArray<PathSegment>,
  maxNestedErrors: number,
  limitUnionOptions: boolean,
): string {
  switch(issue.kind) {
    case "type":
      return `${formatSubject(path, issue.subject)} is not ${expectedType(issue.expected)}`;
    case "literal":
      return `${formatSubject(path, issue.subject)} does not equal ${formatLiteral(issue.expected)}`;
    case "instance-of":
      return `${formatSubject(path, issue.subject)} is not an instance of ${issue.expectedClass || "the expected class"}`;
    case "guard":
      return issue.threw
        ? `${formatSubject(path, issue.subject)} threw while checking guard ${quote(issue.name)}`
        : `${formatSubject(path, issue.subject)} did not satisfy guard ${quote(issue.name)}`;
    case "validation":
      return issue.threw
        ? `${formatSubject(path, issue.subject)} threw while checking validation ${quote(issue.description)}`
        : `${formatSubject(path, issue.subject)} failed validation ${quote(issue.description)}`;
    case "missing":
      return `${formatSubject(path, issue.subject)} is missing`;
    case "unknown-property":
      return `${formatSubject(path, issue.subject)} is an unknown property`;
    case "never":
      return `${formatSubject(path, issue.subject)} cannot satisfy never`;
    case "at":
      return format(issue.issue, [ ...path, ...issue.path ], maxNestedErrors, limitUnionOptions);
    case "multiple":
      return issue.issues.map(child => {
        return format(child, path, maxNestedErrors, limitUnionOptions);
      }).join("\n");
    case "union":
      return formatUnion(
        issue.issues,
        path,
        issue.subject,
        maxNestedErrors,
        limitUnionOptions,
      );
    default:
      return assertNever(issue);
  }
}

function formatUnion(
  issues: ReadonlyArray<Issue>,
  path: ReadonlyArray<PathSegment>,
  unionSubject: RuntimeType,
  maxNestedErrors: number,
  limitOptions: boolean,
): string {
  const distinctIssues = deduplicateUnionIssues(issues, path);
  const expectations = distinctIssues.map(issue => simpleExpectation(issue, path));
  if(expectations.every((value): value is SimpleExpectation => value !== undefined)) {
    const first = expectations[0];
    if(expectations.every(value => samePath(value.path, first.path) && value.subject === first.subject)) {
      return `${formatSubject(first.path, first.subject)} is not ${list(expectations.map(value => value.expected))}`;
    }
  }

  const heading = unionHeading(formatSubject(path, unionSubject), distinctIssues.length);
  const visibleIssues = limitOptions
    ? distinctIssues.slice(0, maxNestedErrors)
    : distinctIssues;
  const branches = visibleIssues.map((issue, index) => {
    const option = formatUnionOption(issue, path, maxNestedErrors);
    return indentBranch(`${index + 1}. `, option);
  });
  const omitted = distinctIssues.length - visibleIssues.length;
  if(omitted > 0) {
    branches.push(`... ${count(omitted, "more option", "more options")} omitted.`);
  }
  return [ heading, ...branches ].join("\n");
}

function deduplicateUnionIssues(
  issues: ReadonlyArray<Issue>,
  path: ReadonlyArray<PathSegment>,
): Issue[] {
  const seen = new Set<string>();
  return issues.filter(issue => {
    const formatted = format(issue, path, Infinity, false);
    if(seen.has(formatted)) return false;
    seen.add(formatted);
    return true;
  });
}

type NestedError = {
  readonly issue: Issue;
  readonly path: ReadonlyArray<PathSegment>;
};

function formatUnionOption(
  issue: Issue,
  path: ReadonlyArray<PathSegment>,
  maxNestedErrors: number,
): string {
  const errors = nestedErrors(issue, path);
  const visible = errors.slice(0, maxNestedErrors).map(error => {
    return format(error.issue, error.path, maxNestedErrors, true);
  });
  const omitted = errors.length - visible.length;
  if(omitted > 0) {
    visible.push(`... ${count(omitted, "more error", "more errors")} omitted for this option.`);
  }
  return visible.join("\n");
}

function nestedErrors(
  issue: Issue,
  path: ReadonlyArray<PathSegment>,
): NestedError[] {
  if(issue.kind === "at") {
    return nestedErrors(issue.issue, [ ...path, ...issue.path ]);
  }
  if(issue.kind === "multiple") {
    let errors: NestedError[] = [];
    for(const child of issue.issues) {
      errors = errors.concat(nestedErrors(child, path));
    }
    return errors;
  }
  return [ { issue, path } ];
}

type SimpleExpectation = {
  readonly path: ReadonlyArray<PathSegment>;
  readonly subject: RuntimeType;
  readonly expected: string;
};

function simpleExpectation(
  issue: Issue,
  path: ReadonlyArray<PathSegment>,
): SimpleExpectation | undefined {
  if(issue.kind === "at") {
    return simpleExpectation(issue.issue, [ ...path, ...issue.path ]);
  }
  if(issue.kind === "type") {
    return {
      path,
      subject: issue.subject,
      expected: expectedType(issue.expected),
    };
  }
  if(issue.kind === "literal" && issue.expected.kind === "null") {
    return { path, subject: issue.subject, expected: "null" };
  }
  return undefined;
}

function validateMaxNestedErrors(value: number): void {
  if(value !== Infinity && (!Number.isInteger(value) || value < 0)) {
    throw new RangeError("maxNestedErrors must be a non-negative integer");
  }
}

function unionHeading(value: string, optionCount: number): string {
  if(optionCount === 1) {
    return `${value} did not match the option in the schema. The option had errors. The errors for the option were:`;
  }
  return `${value} did not match any option in the schema. There were ${optionCount} options, and all options had errors. The errors for each option were:`;
}

function formatSubject(path: ReadonlyArray<PathSegment>, subject: RuntimeType): string {
  if(path.length > 0) return formatPath(path);
  return subject;
}

function formatPath(path: ReadonlyArray<PathSegment>): string {
  let result = "";
  for(const segment of path) {
    switch(segment.kind) {
      case "property":
        result += formatProperty(segment.key);
        break;
      case "array-element":
        result += `[${segment.index}]`;
        break;
      case "dictionary-value":
        result += specialSegment(result, `${ordinal(segment.index + 1)} value in dictionary`);
        break;
      case "map-key":
        result += specialSegment(result, `${ordinal(segment.index + 1)} key in map`);
        break;
      case "map-value":
        result += specialSegment(result, `${ordinal(segment.index + 1)} value in map`);
        break;
      case "set-value":
        result += specialSegment(result, `${ordinal(segment.index + 1)} value in set`);
        break;
      default:
        assertNever(segment);
    }
  }
  return result;
}

function formatProperty(key: string | symbol): string {
  if(typeof key === "symbol") return `[${String(key)}]`;
  if(/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `.${key}`;
  return `[${JSON.stringify(key)}]`;
}

function specialSegment(prefix: string, description: string): string {
  return `${prefix.length > 0 ? "." : ""}<${description}>`;
}

function expectedType(type: ExpectedType): string {
  if(type === "undefined") return "undefined";
  const article = /^[aeiou]/.test(type) ? "an" : "a";
  return `${article} ${type}`;
}

function formatLiteral(literal: LiteralExpectation): string {
  switch(literal.kind) {
    case "undefined":
      return "undefined";
    case "null":
      return "null";
    case "boolean":
    case "number":
      return String(literal.value);
    case "bigint":
      return `${literal.value}n`;
    case "string":
      return quote(literal.value);
    case "opaque":
      return `the expected ${literal.type} literal`;
    default:
      return assertNever(literal);
  }
}

function quote(value: string): string {
  return JSON.stringify(value);
}

function count(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

function ordinal(value: number): string {
  const lastTwoDigits = value % 100;
  if(lastTwoDigits >= 11 && lastTwoDigits <= 13) return `${value}th`;

  switch(value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

function list(values: ReadonlyArray<string>): string {
  if(values.length === 0) return "any expected type";
  if(values.length === 1) return values[0];
  if(values.length === 2) return `${values[0]} or ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, or ${values[values.length - 1]}`;
}

function samePath(left: ReadonlyArray<PathSegment>, right: ReadonlyArray<PathSegment>): boolean {
  if(left.length !== right.length) return false;
  return left.every((segment, index) => {
    const other = right[index];
    if(segment.kind !== other.kind) return false;
    if(segment.kind === "property" && other.kind === "property") return segment.key === other.key;
    if("index" in segment && "index" in other) return segment.index === other.index;
    return false;
  });
}

function indentBranch(prefix: string, value: string): string {
  const lines = value.split("\n");
  const continuation = " ".repeat(prefix.length);
  return `${prefix}${lines[0]}${lines.slice(1).map(line => `\n${continuation}${line}`).join("")}`;
}

function assertNever(value: never): never {
  throw new Error(`Unknown issue variant: ${String(value)}`);
}
