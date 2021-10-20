import { expect } from "chai";
import loadEnv from "../src"

describe("Loadenv", () => {
  const backupEnv = {...process.env}
  afterEach(() => { process.env = backupEnv })

  it("Should load an environment variable", () => {
    process.env = {
      ...backupEnv,
      FOO: "foo",
      BAR: "bar",
      BAZ: "baz",
    }

    type Config = {
      foo: string
      bar: string
      baz: string
    }
    const env = loadEnv<Config>({
      foo: "FOO",
      bar: "BAR",
      baz: "BAZ",
    });
    expect(env).to.deep.equal({
      foo: "foo",
      bar: "bar",
      baz: "baz",
    })
  })
  it("Should throw if a required environment variable is not set", () => {
    type Config = {
      foo: string
      bar: string
      baz: string
    }
    try {
      loadEnv<Config>({
        foo: "FOO",
        bar: "BAR",
        baz: "BAZ",
      });
      return Promise.reject(new Error("Should have thrown"))
    } catch (e) {
      expect((e as Error).message).to.equal(`Invalid environment:\n\t"FOO" is required\n\t"BAR" is required\n\t"BAZ" is required`)
    }
  })

  describe("Should set a variable as optional", () => {
    it("by using required: false", () => {
      const env = loadEnv({ foo: { env: "FOO", required: false }})

      expect(env).to.deep.equal({})
    })
    it("by using optional: true", () => {
      const env = loadEnv({ foo: { env: "FOO", optional: true }})

      expect(env).to.deep.equal({})
    })
  })

  it("It should not trim the environment variable", () => {
    process.env = { ...backupEnv, FOO: "   BAR   " }

    const env = loadEnv({ foo: "FOO" })

    expect(env).to.deep.equal({ foo: "   BAR   "})
  })
  it("Should allow trimming", () => {
    process.env = { ...backupEnv, FOO: "   BAR   " }

    const env = loadEnv({ foo: { env: "FOO", trim: true }})

    expect(env).to.deep.equal({ foo: "BAR"})
  })

  describe("Should validate if a value is in a set", () => {
    it("has the value in the set", () => {
      process.env = { ...backupEnv, FOO: "foo" }

      const env = loadEnv({ foo: { env: "FOO", valid: [ "foo", "bar", "baz" ]}})

      expect(env).to.deep.equal({foo: "foo"})
    })
    it("has not the value in the set", () => {
      process.env = { ...backupEnv, FOO: "banana" }

      try {
        loadEnv({ foo: { env: "FOO", valid: [ "foo", "bar", "baz" ]}})
        return Promise.reject(new Error("Should have thrown"))
      }
      catch (e) {
        expect((e as Error).message).to.equal(`Invalid environment:\n\t"FOO" must be one of [foo, bar, baz]`)
      }
    })
  })

  describe("Should handle default values", () => {
    it("Should assume an env with a default value to be optional and take the default value", () => {
      const env = loadEnv({ foo: { env: "FOO", default: "foo" }})

      expect(env).to.deep.equal({ foo: "foo" })
    })
    it("Should take the defined value if a default value is provided", () => {
      process.env = { ...backupEnv, FOO: "BAR" }

      const env = loadEnv({ foo: { env: "FOO", default: "foo" }})

      expect(env).to.deep.equal({ foo: "BAR" })
    })
    ;[false, null, ""].forEach(falsy => {
      it(`Should allow falsy values as default (${falsy})`, () => {
        const env = loadEnv({ foo: { env: "FOO", default: falsy }})

        expect(env).to.deep.equal({ foo: falsy })
      })
    })
  })

  describe("types", () => {
    describe("number", () => {
      it("Should convert an env var to a number", () => {
        process.env = { ...backupEnv, FOO: "13.37" }

        const env = loadEnv({ foo: { env: "FOO", type: "number" }})

        expect(env).to.deep.equal({ foo: 13.37 })
      })
    })
    describe("boolean", () => {
      it("Should convert an env var to a boolean", () => {
        process.env = { ...backupEnv, FOO: "FALSE" }

        const env = loadEnv({ foo: { env: "FOO", type: "boolean" }})

        expect(env).to.deep.equal({ foo: false })
      })
    })
  })

  it("Should handle nested objects", () => {
    process.env = {
      ...backupEnv,
      A: "a",
      B: "b",
      C: "c",
      D: "d"
    }

    const env = loadEnv({
      a: {
        b: {
          c: "C",
        },
        d: "D",
        e: { env: "E", default: "e" },
      },
      foo: {
        a: "A",
        bar: "B"
      }
    })

    expect(env).to.deep.equal({
      a: {
        b: {
          c: "c"
        },
        d: "d",
        e: "e",
      },
      foo: {
        a: "a",
        bar: "b"
      }
    })
  })
  it("Should handle arrays")
})
