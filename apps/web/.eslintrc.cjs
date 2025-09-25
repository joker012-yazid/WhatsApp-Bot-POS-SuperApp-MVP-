module.exports = {
  root: false,
  extends: ['@spec/config/eslint', 'next/core-web-vitals'],
  parserOptions: {
    project: ['./tsconfig.json']
  }
};
