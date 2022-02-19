# deno_depchecker

Analyze your dependencies in your Deno project.

WIP, but works.

- Checks for outdated dependencies and optionally upgrades them.
- Supports https://deno.land (std & x) (only at the moment).

## Install

```
deno install -Af --no-check --name depchecker insert-url-here
```

## Usage

```
depchecker ./path/to/module.ts [--fix]
```

## License

Apache-2.0 licensed.

Copyright 2022 © DjDeveloperr
