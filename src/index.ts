import Joi from "joi"

type JsonJoiBasicType = string | boolean | number

type JsonJoi = {
  type?: "string"|"number"|"boolean"
  required?: boolean
  optional?: boolean
  trim?: boolean
  default?: JsonJoiBasicType | null
  valid?: Array<JsonJoiBasicType>
}

type JoiEnv = {
  env: string
} & JsonJoi

type Schema<T> = Record<keyof T, string | JoiEnv | {[ key: string ]: Schema<T[keyof T]>}>

const convertJson2JoiString = (jsonSchema: JsonJoi): Joi.StringSchema => {
  let schema = Joi.string()

  if (jsonSchema.trim === true)
    schema = schema.trim()

  return schema
}

const convertJson2Joi = (jsonSchema: JsonJoi): Joi.Schema => {
  let schema = jsonSchema.type === "number"
    ? Joi.number()
    : jsonSchema.type === "boolean"
    ? Joi.boolean()
    : convertJson2JoiString(jsonSchema)

  if (jsonSchema.required !== false)
    schema = schema.required()
  if (jsonSchema.optional === true)
    schema = schema.optional()

  if (Array.isArray(jsonSchema.valid))
    schema = schema.valid(...jsonSchema.valid)

  if (jsonSchema.default !== undefined)
    schema = schema.default(jsonSchema.default).optional()

  return schema
}

const build = <T>(schema: Schema<T>): [ Joi.ObjectSchema, Record<keyof T, string> ] => {
  const joiObject = new Map<keyof T, Joi.Schema>()
  const envValues = new Map<keyof T, string | {[ key: string ]: string }>()

  for (const key in schema) {
    if (typeof schema[key] === 'string') {
      joiObject.set(key, Joi.string().required().label(schema[key] as string))
      if (process.env[schema[key] as string] !== undefined)
        envValues.set(key, process.env[schema[key] as string] as string)
    }
    else if (schema[key].hasOwnProperty("env")) {
      joiObject.set(key, convertJson2Joi({...(schema[key] as JoiEnv) }).label((schema[key] as JoiEnv).env))
      if (process.env[(schema[key] as JoiEnv).env] !== undefined)
        envValues.set(key, process.env[(schema[key] as JoiEnv).env] as string)
    }
    else {
      const [ nestedJoi, nestedEnv ] = build<Extract<typeof schema[typeof key], string | JoiEnv>>(schema[key] as any)
      joiObject.set(key, nestedJoi)
      envValues.set(key, nestedEnv)
    }
  }

  return [
    Joi.object(Object.fromEntries(joiObject.entries())),
    Object.fromEntries(envValues.entries()) as Record<keyof T, string>,
  ]
}

export default function LoadEnv<T>(schema: Schema<T>): T {
  const [ joiSchema, envValue ] = build<T>(schema)

  const { value, error } = joiSchema.validate(envValue, {
    abortEarly: false,
    stripUnknown: true,
  })

  if (error)
    throw new Error(`Invalid environment:\n\t${error.details.map(e => e.message).join("\n\t")}`)

  return value
}
