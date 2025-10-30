import js from '@eslint/js';
import nextPlugin from '@next/eslint-plugin-next';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import tsParser from '@typescript-eslint/parser';
import globals from 'globals';

const project = './tsconfig.json';

const typescriptPlugin = {
  meta: {
    name: '@typescript-eslint/eslint-plugin-stub',
    version: '0.0.0',
  },
  rules: {},
  configs: {
    'recommended-type-checked': { rules: {} },
    'stylistic-type-checked': { rules: {} },
  },
};

const baseIgnores = [
  '.next/**',
  'coverage/**',
  'eslint.config.mjs',
  'node_modules/**',
  'public/**',
  'sql/**',
  'supabase/migrations/**',
  'supabase_sql/**',
  'vendor/**',
];

const sharedGlobals = {
  ...globals.browser,
  ...globals.node,
  React: 'readonly',
};

export default [
  {
    ignores: baseIgnores,
  },
  js.configs.recommended,
  {
    rules: {
      'no-extra-semi': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        project,
        sourceType: 'module',
        tsconfigRootDir: process.cwd(),
      },
      globals: sharedGlobals,
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: {
          project,
        },
      },
    },
    rules: {
      'import/order': 'off',
      'no-unused-vars': 'off',
      'no-empty': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: sharedGlobals,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      'import/order': 'off',
      'no-empty': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
