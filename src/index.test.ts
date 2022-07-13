import Joi from "joi"
import { expect } from "chai"
import JoiEnv from "."

describe("JoiEnv", () => {
  const bkp = { ...process.env }
  afterEach(() => {
    process.env = { ...bkp }
  })

  describe("Source", () => {
    describe("value is a joi object with a tag", () => {
      it("The tag exists in env -> take value", () => {
        process.env.TEST_ENV = "test"

        const { key } = JoiEnv<{ key: string }>({ key: Joi.string().tag("TEST_ENV") })

        expect(key).to.eq("test")
      })
      it("The tag does not exists in env, but the key does -> invalid", () => {
        process.env.key = "test"

        try {
          JoiEnv({ key: Joi.string().required().tag("TEST_ENV") })
          return Promise.reject(new Error("Should have thrown"))
        } catch (ex) {
          const e = ex as Error
          expect(e.message).to.eq('Some environment variables are missing:\n\t"TEST_ENV" is required')
        }
      })
    })
    describe("value is a joi object with no tag", () => {
      it("Key (Key as is) is the env", () => {
        process.env.Key = "test"

        const { Key } = JoiEnv<{ Key: string }>({ Key: Joi.string().required() })

        expect(Key).to.eq("test")
      })
      it("KEY (Key.toUpperCase()) is the env", () => {
        process.env.KEY = "test"

        const { Key } = JoiEnv<{ Key: string }>({ Key: Joi.string().required() })

        expect(Key).to.eq("test")
      })
      it("key (Key.toLowerCase()) is the env", () => {
        process.env.key = "test"

        const { Key } = JoiEnv<{ Key: string }>({ Key: Joi.string().required() })

        expect(Key).to.eq("test")
      })
      it("KEY and key exists for Key -> KEY takes precedence", () => {
        process.env.KEY = "upper"
        process.env.key = "lower"

        const { Key } = JoiEnv<{ Key: string }>({ Key: Joi.string().required() })

        expect(Key).to.eq("upper")
      })
      it("Key and KEY exiets for Key -> KEY takes precedence", () => {
        process.env.KEY = "upper"
        process.env.Key = "ucfirst"

        const { Key } = JoiEnv<{ Key: string }>({ Key: Joi.string().required() })

        expect(Key).to.eq("ucfirst")
      })
    })
    describe("Value is a string", () => {
      it("If the value exists in env -> take its value", () => {
        process.env.TEST_ENV = "test"

        const { key } = JoiEnv<{ key: string }>({ key: "TEST_ENV" })

        expect(key).to.eq("test")
      })
      it("If the value does not exists in env, but the key does -> throw", () => {
        process.env.key = "test"

        try {
          JoiEnv({ key: "TEST_ENV" })
          return Promise.reject(new Error("Should have thrown"))
        } catch (ex) {
          const e = ex as Error
          expect(e.message).to.eq('Some environment variables are missing:\n\t"TEST_ENV" is required')
        }
      })
    })
    describe("value is a string starting w/ ? -> same as tag, but optional", () => {
      it("If the value exists in env -> take its value", () => {
        process.env.TEST_ENV = "test"

        const { key } = JoiEnv<{ key: string }>({ key: "?TEST_ENV" })

        expect(key).to.eq("test")
      })
      it("If the value does not exists in env, but the key does -> undef", () => {
        const { key } = JoiEnv({ key: "?TEST_ENV" })
        expect(key).to.be.undefined
      })
    })
    describe("value is a regex -> same as key, but regex", () => {
      it("only key exists and matches the pattern -> ok", () => {
        process.env.key = "test"

        const { Key } = JoiEnv({ Key: /^test$/ })
        expect(Key).to.eq("test")
      })
      it("Key and KEY don't match the regex, but key does -> throw", () => {
        process.env.key = "test"
        process.env.Key = "Test"
        process.env.KEY = "TEST"

        try {
          JoiEnv({ Key: /^test$/ })
          return Promise.reject(new Error("Should have thrown"))
        } catch (ex) {
          const e = ex as Error
          expect(e.message).to.eq('Some environment variables are missing:\n\t"Key" with value "Test" fails to match the required pattern: /^test$/')
        }
      })
    })
  })

  describe("Values", () => {
    it("Should allow optionals", () => {
      const { foo, bar } = JoiEnv({ foo: "?FOO", bar: "?BAR" })

      expect({ foo, bar }).to.deep.eq({ foo: undefined, bar: undefined })
    })
    it("Should allow number & conversion", () => {
      process.env.TEST = "4242"

      const { foo } = JoiEnv({ foo: Joi.number().tag("TEST") })

      expect(foo).to.eq(4242)
    })
    it("Should validate complex values", () => {
      process.env.TEST = "4242"

      try {
        JoiEnv({ nbr: Joi.number().$.min(1).max(100).rule({ message: '{:#label} must be between 1 and 100' }).tag("TEST") })
        return Promise.reject(new Error("Should have thrown"))
      } catch (ex) {
        const e = ex as Error
        expect(e.message).to.eq('Some environment variables are missing:\n\t"TEST" must be between 1 and 100')
      }
    })

    describe("Should allow nested object", () => {
      it("Should allow nested js object", () => {
        process.env.UNAME = "bo"
        process.env.PASS = "123"

        const { user } = JoiEnv({ user: { uname: "?UNAME", pass: "?PASS" } })

        expect(user).to.deep.equal({ uname: "bo", pass: "123" })
      })
      it("Should allow nested joi object", () => {
        process.env.UNAME = "bo"
        process.env.PASS = "123"

        const { user } = JoiEnv({
          user: Joi.object({
            uname: Joi.string().tag("UNAME"),
            pass: Joi.string().tag("PASS"),
          })
        })

        expect(user).to.deep.equal({ uname: "bo", pass: "123" })
      })
      it("Should allow global joi object", () => {
        process.env.FOO = "foo"
        process.env.BAR = "bar"
        process.env.BLAH = "blah"
        process.env.BLEH = "bleh"

        const cnf = JoiEnv(Joi.object({
          baz: Joi.object({
            foo: Joi.string().tag("FOO"),
            bar: Joi.string().tag("BAR"),
          }),
          bluh: Joi.object({
            blah: Joi.string().tag("BLAH"),
            bleh: Joi.string().tag("BLEH"),
          })
        }))
        expect(cnf).to.deep.eq({
          baz: { foo: "foo", bar: "bar" },
          bluh: { blah: "blah", bleh: "bleh" }
        })
      })
      it("Should allow global joi object (even for a string)", () => {
        process.env.TEST_ROOT_OBJ = "toot"
        const { TEST_ROOT_OBJ } = JoiEnv(Joi.string().required().tag("TEST_ROOT_OBJ"))
        expect(TEST_ROOT_OBJ).to.eq("toot")
      })
      it("Should throw for global joi object if env cannot be inferred", () => {
        try {
          JoiEnv(Joi.string().required())
          return Promise.reject(new Error("Should have thrown"))
        } catch (ex) {
          const e = ex as Error
          expect(e.message).to.eq('Cannot infer environment variable name from schema, use object or .tag')
        }
      })
    })
  })

  describe("Output & Error", () => {
    it("Should only return what was requested", () => {
      process.env.FOO = "test"
      process.env.BAR = "test"
      process.env.TEST = "test"

      const cnf = JoiEnv({ key: "TEST" })

      expect(cnf).to.deep.eq({ key: "test" })
    })

    it("Should show all errors at once", () => {
      try { JoiEnv({ foo: "FOO", bar: "BAR", baz: "BAZ" }) }
      catch (ex) {
        const e = ex as Joi.ValidationError
        expect(e.message).to.eq('Some environment variables are missing:\n\t"FOO" is required\n\t"BAR" is required\n\t"BAZ" is required')
        expect(e.details.length).to.eq(3)
        expect(e.details.map(r => r.type)).to.deep.eq(Array(3).fill("any.required"))
      }
    })

    it("Should be able to relabel entries", () => {
      try { JoiEnv({ foo: Joi.string().required().label("banana").tag("FOO") }) }
      catch (ex) {
        const e = ex as Joi.ValidationError
        expect(e.message).to.eq('Some environment variables are missing:\n\t"banana" is required')
      }
    })
  })
})
