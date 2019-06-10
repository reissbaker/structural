/* noStripWhitespace - disable vim stripping trailing whitespace on file write.
* This is important for the expected error message strings below */
import * as t from '..'
import { indent, indentNext } from '../lib/result'

describe("error integration tests", () => {
  const User = t.subtype({
    username: t.str,
    age: t.optional(t.num),
    email: t.str.validate('has @ symbol', (val) => !!val.match(/@/))
  })

  const Quote = t.exact({
    text: t.str,
    author: t.str,
    date: t.optional(t.instanceOf(Date)),
  })

  const Pic = t.subtype({
    uri: t.str.validate('starts with http', (val) => !!val.match(/^http/)),
    alt: t.str,
  })

  const Post = t.subtype({
    owner: User,
    contents: t.array(Quote.or(Pic)),
  })

  function value(): t.GetType<typeof Post> {
    return {
      owner: {
        username: 'the duke',
        age: 42,
        email: 'duke.nuke@example.com',
      },
      contents: [
        {
          text: 'Those who do not study history are doomed to repeat it',
          author: 'Albert Einstien',
          date: new Date(2001),
        },
        {
          uri: 'https://example.com/pics/albert.jpg',
          alt: 'Mr. Doctor Albert Einstien wearing a tweed jacket',
        }
      ]
    }
  }

  function captureErr(block: () => void): Error {
    let err: Error
    try {
      block()
    } catch (e) {
      err = e
      return err
    }
    throw "no error produced"
  }

  test('the default value is valid', () => {
    Post.assert(value())
  })

  test("either enumerates the missed types", () => {
    const val = value();
    (val.contents[1] as any).uri = 'example.com'

    try {
      Post.assert(val)
      expect.hasAssertions()
    } catch(error) {
      expect(error.message).toMatchSnapshot()
    }
  })

  test("exact prints fields nice", () => {
    const val = value().contents[0]
    ;(val as any).badBoy = true

		const expected = `given value
  { text: 'Those who do not study history are doomed to repeat it',
    author: 'Albert Einstien',
    date: 1970-01-01T00:00:02.001Z,
    badBoy: true }
did not match expected type
  { text: string, author: string, date?: Date }
because: at .badBoy: given value \`true\` did not match expected type \`never\`:
    unknown key \`badBoy\` should not exist`

    expect(() => {
      Quote.assert(val)
    }).toThrow(expected)
  })

  test("error contains a full .causes", () => {
    const err = captureErr(() => {
      const val = value();
      (val.contents[1] as any).uri = 'example.com'
      Post.assert(val)
    })

    expect(err).toBeInstanceOf(t.StructuralError)
    const se = err as t.StructuralError
    expect(se.causes).toHaveLength(3)
    expect(se.causes[0].toString()).toMatch(/at .contents\[1].text/)
    expect(se.causes[1].toString()).toMatch(/at .contents\[1].author/)
    expect(se.causes[2].toString()).toMatch(/at .contents\[1].uri/)
  })

  describe("helpers", () => {
    describe("indentNext", () => {
      test("does not make any changes to single-line strings", () => {
        expect(indentNext("foo")).toEqual("foo")
      })

      test("indents lines after the first line", () => {
        expect(indentNext("foo\nbar\nbaz")).toEqual("foo\n  bar\n  baz")
      })
    })

    describe("indent", () => {
      test("indents all lines", () => {
        expect(indent("foo\nbar")).toEqual("  foo\n  bar")
      })
    })
  })
})
