module.exports = {
  root: true,
  extends: ['@spec/config/eslint'],
  parserOptions: {
    project: './tsconfig.json'
  },
  env: {
    node: true,
    jest: true
  },
  ignorePatterns: ['dist', 'node_modules']
};
