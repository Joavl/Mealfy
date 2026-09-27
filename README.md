# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

## Backend E2E with real PostgreSQL

Run the authenticated HTTP E2E suite from the repository root:

```sh
npm run test:e2e
```

On a fresh checkout, install the locked backend dependencies once with `npm ci --prefix backend`. Docker with Compose must also be available. `npm run test:e2e` is the supported E2E entry point locally and in CI. It starts PostgreSQL from the root `compose.yaml`, discovers the random loopback port, creates the isolated `mealfy_e2e` connection internally, applies all Prisma migrations, serializes scenarios, runs the existing authorization regression test, and tears the database down even after failure. The runner deliberately ignores external `E2E_DATABASE_URL`, `DATABASE_URL`, and the application `.env` database; the E2E test also refuses non-test or non-local connections.

Every scenario truncates application tables before running while retaining migration metadata. Add critical auth, authorization, transaction, and state coverage as `backend/test/*.e2e.test.ts` through `createApp()` and the real PostgreSQL seam. Keep narrow routing tests with isolated stubs where they provide faster feedback. Independent suite invocations use distinct Compose projects and random ports, so they do not collide.


- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
