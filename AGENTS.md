# Development Guidelines

## Project-specific notes

- This repo is a Nature Remo control MCP server on Cloudflare Workers (`Hono` + `@hono/mcp`).
- Runtime baseline: Node `24.13.0` (`.node-version`) and `pnpm`.
- Worker entrypoint is `src/index.ts`.
- Nature Remo API client is function-based (`createNatureRemoClient`) in `src/nature-remo.ts`.
- Unit tests live under `src/**/*.test.ts`.
- Cloudflare types are generated via `wrangler types` into `worker-configuration.d.ts` (do not use `@cloudflare/workers-types`).

## MCP contract in this repo

- Public MCP endpoint: `/mcp` (Streamable HTTP).
- Optional bearer auth on `/mcp` is implemented with `hono/bearer-auth` (token from `env(c)`).

## Secrets used by this Worker

- Required: `NATURE_REMO_ACCESS_TOKEN`
- Optional: `MCP_BEARER_TOKEN` (if set, `/mcp` requires `Authorization: Bearer <token>`)

## Local checks before finishing changes

- `pnpm fix`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`

## Style preference for this repo

- Prefer arrow functions by default.
- Avoid classes when possible.
- Use `kebab-case` for file names.
- Write all code comments (including JSDoc and inline comments) in English.
- Exception: error classes are allowed and should be isolated in `src/errors/`.
- Use repository-relative paths in docs/instructions; avoid user-specific absolute paths.

## Additional references

Check agent skills if necessary

## Git conventions

- Use commit message prefixes such as `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, and `test:`.
- Write commit message subjects in English, and start the subject text with an uppercase letter after the prefix.
