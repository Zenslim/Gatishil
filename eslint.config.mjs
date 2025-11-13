import path from 'node:path';
import tseslint from 'typescript-eslint';
import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactPlugin from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierPlugin from 'eslint-plugin-prettier';
import pluginReactConfig from 'eslint-plugin-react/configs/recommended.js';
import pluginReactJsxRuntime from 'eslint-plugin-react/configs/jsx-runtime.js';
import jsxA11yStrict from 'eslint-plugin-jsx-a11y/strict';

const project = path.join(process.cwd(), 'tsconfig.eslint.json');

export default tseslint.config(
  {
    ignores: ['.next/**', 'node_modules/**', 'supabase/**', 'coverage/**', 'public/**', 'sql/**', 'prisma/**'],
  },
  {
    extends: [js.configs.recommended],
  },
  nextPlugin.configs['core-web-vitals'],
  pluginReactConfig,
  pluginReactJsxRuntime,
  jsxA11yStrict,
  importPlugin.configs.recommended,
  importPlugin.configs['typescript'],
  prettierPlugin.configs.recommended,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      import: importPlugin,
      'jsx-a11y': jsxA11y,
      react: reactPlugin,
      'react-hooks': reactHooks,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project,
        tsconfigRootDir: process.cwd(),
      },
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project,
        },
      },
    },
    rules: {
      ...tseslint.configs['recommended-type-checked'].rules,
      ...tseslint.configs['stylistic-type-checked'].rules,
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true,
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: { attributes: false },
        },
      ],
      '@typescript-eslint/no-unnecessary-type-parameters': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      'import/no-default-export': 'off',
      'import/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'prettier/prettier': 'error',
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'tests/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
);
