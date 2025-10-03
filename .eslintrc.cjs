module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json'
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript'
  ],
  rules: {
    'import/order': [
      'warn',
      {
        'alphabetize': { order: 'asc', caseInsensitive: true },
        'newlines-between': 'always'
      }
    ],
    'import/no-unresolved': 'off'
  }
};
