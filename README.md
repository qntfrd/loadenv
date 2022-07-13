# Joienv

Loads and validate your environement variables using Joi


# TL;DR

```ts
import JoiEnv from "joienv"
import Joi from "joi"

type Config = {
  misc: {
    baseUrl: string,
    env: string,
    port: number,
  },
  mongo: {
    connectionString: string,
    db?: string
  },
}

const Schema = {
  misc: {
    port: Joi.number().port(), // will read `process.env.port ?? process.env.PORT`
                               // and validate it against this rule
    baseUrl: "BASE_URL", // will validate against `process.env.BASE_URL,
                         // `Joi.string().required().tag("BASE_URL")
    env: /^(dev|staging|prod)$/, // will validate `process.env.env ?? process.env.ENV`
                                 // against this regex
  },
  mongo: {
    cs: Joi.string().required()
           .uri({ scheme: ["mongodb", "mongodb+srv"] }) // validate agains this rule
           .tag("MONGODB_URI"), // check for this env var `process.env.MONGODB_URI`
    db: "?MONGODB_DB" // Will convert in `Joi.string().optional().tag("MONGODB_DB")
  }
}

const config = JoiEnv<Config>(Schema)
```

**NB**
- JoiEnv will use the env var as a label, unless specified otherwise
- JoiEnv will first test for the tag OR then the key, then key uppercase and finnaly key lowercase:
  `tag ? process.env[tag] : process.env[key] ?? process.env[key.toUpperCase()] ?? process.env[key.toLowerCase()]`
- You can wrap nested objects in `Joi.object()` for better control


## API

### `loadenv<T>(config: Config): T`

Loads & validate your environment, and returns it as the object you want

`Config` is defined as follow:

```ts
type Config = {
  [key: string]:
      string // Takes the environment variable
    | RegExp // Validation object by joi
    | Config // Nested configutaion object
    | Joi.Schema // Joi schema object
}
```

**NB**
- when using a string, you can prefix it with a `?` to make it optional (e.g. `?FOO`)


## Q & A

### Why is this different than [dotenv](https://npmjs.com/dotenv) ?

[dotenv](https://npmjs.com/dotenv) is used to inject a "configuration file" into
`process.env`.  
Loadenv makes sure your environment is properly configured and is valid.

The two libs can work hand in hands because they do not serve the same purpose.
