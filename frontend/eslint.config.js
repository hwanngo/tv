import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },

  // Base JS + type-aware TypeScript rules + React plugins for all source files.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Test files run in Node + jsdom with Vitest globals available.
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'src/test-setup.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
    },
  },

  // Config files run in Node.
  {
    files: ['**/*.config.{ts,js}'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Plain JS files (configs) are outside the TS project — skip type-aware rules.
  {
    files: ['**/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Disable stylistic rules that Prettier owns. Must stay last.
  prettier
);
