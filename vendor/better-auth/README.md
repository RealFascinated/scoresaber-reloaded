# Vendored Better Auth (Steam OpenID 2.0 build)

`better-auth` and `@better-auth/core` are built from
https://github.com/better-auth/better-auth/pull/11510 (branch `feat/steam-social-sign-on`,
commit `6c33d8c6a6ac38c6dd4f56d445189100bf58cac9`), which adds the built-in `steam` social provider.

Remove this folder and the `file:` / `overrides` entries in `package.json` once the PR ships in a
published `better-auth` release, and depend on that release instead.

Rebuild: clone the branch, `pnpm install --ignore-scripts`, `pnpm --filter 'better-auth...' build`,
then `pnpm pack` in `packages/core` and `packages/better-auth`.
