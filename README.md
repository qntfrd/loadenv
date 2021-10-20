# Joienv

load your environment in a config file

## Getting started

```ts
import loadEnv from "joienv";

const schema = {
  port: { env: "PORT", type: number, port: true },
  env:  "ENV",
  pg: {
    host: "DB_HOST",
    user: "DB_USER",
    pass: "DB_PASS",
  }
}

interface Config {
  port: number;
  env: string;
  pg: {
    host: string;
    user: string;
    pass: string;
  }
}

const config = loadenv<Config>(schema)
```

Notes:
- One can create the config object that one wants, loadenv will follow it
- Each key is mapped to an environment variable named after the value
  (i.e. `{ port: "PORT" }` will return `{ port: process.env.PORT }`)
- The configuration can be nested
- If you do not want to nest, but use [joi](https://joi.dev) validation and
  coercion instead, use the `{env: "ENV_NAME"}` to denote the environment
  variable to load, and the rest of the object keys will be for joi
  (e.g. `{ foo: "FOO" }` &equiv; `{ foo: { env: "FOO" }}` &rArr; `{ foo: process.env.FOO }`)
- If any environment variable is undefinded, or invalid (e.g. port is < 0),
  loadenv will throw, with a human readable error message

## API

### `loadenv<T>(config: Config): T`

Loads & validate your environment, and returns it as the object you want

`Config` is defined as follow:

```ts
type Config = {
  [key: string]:
      string // Takes the environment variable
    | Config // Nested configutaion object
    | JoiEnv // Validation object by joi
}

type JoiEnv = {
  env: string // The name of the environment variable
} | JoiJsonSchema
```

## Q & A

### Why is this different than [dotenv](https://npmjs.com/dotenv) ?

[dotenv](https://npmjs.com/dotenv) is used to inject a "configuration file" into
`process.env`.  
Loadenv makes sure your environment is properly configured and is valid.

The two libs can work hand in hands because they do not serve the same purpose.
