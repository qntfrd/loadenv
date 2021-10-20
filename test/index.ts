import { expect } from "chai"

describe("Loadenv", () => {
  it("Should load an environment variable")
  it("Should throw if a required environment variable is not set")

  describe("Should set a variable as optional", () => {
    it("by using required: false")
    it("by using optional: true")
  })

  it("It should trim the environment variable")
  it("Should disable trimming")

  it("Should validate if a value is in a set")

  describe("Should handle default values", () => {
    it("Should assume an env with a default value to be optional and take the default value")
    it("Should take the defined value if a default value is provided")
  })

  describe("types", () => {
    describe("number", () => {
      it("Should convert an env var to a number")
    })
    describe("boolean", () => {
      it("Should convert an env var to a boolean")
    })
  })

  it("Should handle nested objects")
  it("Should handle arrays")
})
