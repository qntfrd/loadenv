import Joi from "joi"

type CustomSchema = {
  [key: string]: Joi.Schema | string | RegExp | Schema
}

type Schema = CustomSchema|Joi.Schema

const inferKeyValueFromObjKey = (key: string): { key: string, value: unknown } => {
  if (process.env[key] !== undefined)
    return { key, value: process.env[key] }
  if (process.env[key.toUpperCase()] !== undefined)
    return { key: key.toUpperCase(), value: process.env[key.toUpperCase()] }
  if (process.env[key.toLowerCase()] !== undefined)
    return { key: key.toLowerCase(), value: process.env[key.toLowerCase()] }
  return { key, value: undefined }
}

const inferKeyValueFromSchema = (key: string, joi: Joi.Schema): { key: string, value: unknown } => {
  const desc = joi.describe()
  if (desc.tags && desc.tags.length)
    return { key: desc.tags[0], value: process.env[desc.tags[0]] }
  return inferKeyValueFromObjKey(key)
}

const overrideLabelIfPossible = (joi: Joi.Schema, label: string): Joi.Schema => {
  const desc = joi.describe()
  if ((desc.flags as any)?.label) return joi
  return joi.label(label)
}

const parseJoiSchema = (schema: Joi.Schema): { joi: Joi.Schema, env: Record<string, unknown> } => {
  const env: [string, unknown][] = []

  if (schema.type === "object") {
    schema.$_terms.keys = schema.$_terms.keys.map((term: any) => {
      const { key, schema: s } = term
      const { key: k, value: v } = inferKeyValueFromSchema(key, s)
      term.schema = overrideLabelIfPossible(s, k)

      if (s.type === "object") {
        const { env: e } = parseJoiSchema(s)
        env.push([k, e])
      }
      else {
        env.push([key, v])
      }

      return term
    })

    return { joi: schema, env: Object.fromEntries(env) }
  }
  else {
    const { key: k, value: v } = inferKeyValueFromSchema("__THIS$CANNOT$EXIST__", schema)
    if (k === "__THIS$CANNOT$EXIST__") throw new Error("Cannot infer environment variable name from schema, use object or .tag")
    return { joi: Joi.object({ [k]: overrideLabelIfPossible(schema, k) }), env: { [k]: v } }
  }
}

const parseCustomSchema = (schema: CustomSchema): { joi: Joi.Schema, env: Record<string, unknown> } => {
  const joi: [string, Joi.Schema][] = []
  const env: [string, unknown][] = []

  Object.entries(schema).forEach(([key, value]) => {
    if (typeof value === "string" && value[0] === "?") {
      joi.push([
        key,
        Joi.string()
           .allow("")
           .empty("")
           .optional()
           .label(value.slice(1))
      ])
      env.push([key, process.env[value.slice(1)]])
    }
    else if (typeof value === "string") {
      joi.push([key, Joi.string().required().label(value)])
      env.push([key, process.env[value]])
    }
    else if (value instanceof RegExp) {
      const { key: k, value: v} = inferKeyValueFromObjKey(key)
      joi.push([key, Joi.string().required().regex(value).label(k)])
      env.push([key, v])
    }
    else if (Joi.isSchema(value)) {
      const desc = value.describe()
      if (desc.type === "object") {
        const { joi: j, env: e } = parseSchema(value)
        joi.push([key, j])
        env.push([key, e])
      }
      else {
        const { key: k, value: v } = inferKeyValueFromSchema(key, value)
        joi.push([key, overrideLabelIfPossible(value, k)])
        env.push([key, v])
      }
    }
    else {
      const { joi: j, env: e } = parseSchema(value)
      joi.push([key, j])
      env.push([key, e])
    }
  })

  return { joi: Joi.object(Object.fromEntries(joi)), env: Object.fromEntries(env) }
}

const parseSchema = (schema: Schema): { joi: Joi.Schema, env: Record<string, unknown> } =>
  Joi.isSchema(schema)
    ? parseJoiSchema(schema)
    : parseCustomSchema(schema)

const JoiEnv = <T extends Object>(schema: Schema): T => {
  const { joi, env } = parseSchema(schema)

  const { value, error } = joi.validate(env, {
      abortEarly: false
    })

  if (error) {
    const errors = error.details.map(e => e.message)
    error.message = `Some environment variables are missing:\n\t${errors.join("\n\t")}`
    throw error
  }

  return value as T
}

export default JoiEnv
