---
path: /Volumes/Ext/GenAI/JobSeeker/next.config.ts
type: config
updated: 2026-05-22
status: active
---

# next.config.ts

## Purpose

Next.js configuration file that customizes the build and runtime behavior of the application. Marks `pdfjs-dist` as a server-external package to prevent it from being bundled by webpack.

## Exports

- `nextConfig` — typed `NextConfig` object with project-specific Next.js settings
- `default` — the `nextConfig` object (default export consumed by Next.js)

## Dependencies

None

## Used By

TBD

## Notes

`serverExternalPackages` keeps `pdfjs-dist` out of the server bundle, which is typical for native-or-WASM-heavy PDF libraries that must load from `node_modules` at runtime rather than being inlined.