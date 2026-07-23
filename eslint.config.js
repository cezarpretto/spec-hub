import tseslint from 'typescript-eslint'

export default tseslint.config({
  files: ['src/**/*.ts'],
  extends: [
    ...tseslint.configs.recommended,
  ],
  rules: {
    'no-duplicate-imports': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-empty-object-type': 'off',
  },
})
