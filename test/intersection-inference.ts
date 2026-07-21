import { expectTypeOf, test } from "vitest";
import { t } from "../index";

const BlogPostBaseSpec = t.subtype({
  title: t.str,
  date: t.str,
  newsletter: t.bool,

  inAppNotify: t.optional(t.subtype({
    title: t.str,
    message: t.str,
  })),
});

const TimeSpec = t.subtype({
  time: t.str,
});

const BlogPostFrontMatterSpec = BlogPostBaseSpec.and(TimeSpec);

type BlogPostBase = {
  title: string;
  date: string;
  newsletter: boolean;
  inAppNotify?: {
    title: string;
    message: string;
  };
};

test("structural intersections preserve the sliced type", () => {
  const base = BlogPostBaseSpec.slice({
    title: "Structural 0.0.34",
    date: "2026-07-21",
    newsletter: true,
  });
  const time = TimeSpec.slice({ time: "12:00" });
  const value = BlogPostFrontMatterSpec.slice({
    title: "Structural 0.0.34",
    date: "2026-07-21",
    newsletter: true,
    time: "12:00",
  });

  expectTypeOf(base).not.toBeAny();
  expectTypeOf(base).toMatchTypeOf<BlogPostBase>();
  expectTypeOf<t.GetType<typeof BlogPostBaseSpec>>().toMatchTypeOf<BlogPostBase>();

  expectTypeOf(time).not.toBeAny();
  expectTypeOf(time).toMatchTypeOf<{ time: string }>();
  expectTypeOf<t.GetType<typeof TimeSpec>>().toMatchTypeOf<{ time: string }>();

  expectTypeOf(value).not.toBeAny();
  expectTypeOf(value).toMatchTypeOf<BlogPostBase & { time: string }>();
  expectTypeOf(value.title).toEqualTypeOf<string>();
  expectTypeOf(value.date).toEqualTypeOf<string>();
  expectTypeOf(value.newsletter).toEqualTypeOf<boolean>();
  expectTypeOf(value.time).toEqualTypeOf<string>();
});
