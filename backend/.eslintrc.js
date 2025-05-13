module.exports = {
  env: {
    node: true,
    es2021: true,
    mocha: true,
  },

  settings: {
    node: {
      version: '>=18.0.0',
    },
  },

  extends: [
    'eslint:recommended',
    'plugin:node/recommended',
    'plugin:security/recommended',
  ],

  plugins: ['node', 'security', 'promise'],

  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },

  rules: {
    'no-case-declarations': 'off',

    // Error Prevention
    'no-console': 'off',
    'no-debugger': 'warn',
    'no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'no-undef': 'warn',
    'no-unreachable': 'warn',
    'no-empty': ['error', { allowEmptyCatch: true }],

    // Code Quality
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-template': 'error',

    // Async / Promise Rules
    'promise/always-return': 'warn',
    'promise/no-return-wrap': 'warn',
    'promise/param-names': 'warn',
    'promise/catch-or-return': 'warn',
    'promise/no-native': 'off',
    'promise/no-nesting': 'off',
    'promise/no-promise-in-callback': 'off',
    'promise/no-callback-in-promise': 'off',
    'promise/avoid-new': 'off',

    // Security Rules (relaxed)
    'security/detect-buffer-noassert': 'warn',
    'security/detect-child-process': 'warn',
    'security/detect-disable-mustache-escape': 'warn',
    'security/detect-eval-with-expression': 'warn',
    'security/detect-no-csrf-before-method-override': 'warn',
    'security/detect-non-literal-fs-filename': 'off',
    'security/detect-non-literal-regexp': 'off',
    'security/detect-non-literal-require': 'off',
    'security/detect-object-injection': 'off',
    'security/detect-possible-timing-attacks': 'off',
    'security/detect-pseudoRandomBytes': 'warn',
    'security/detect-unsafe-regex': 'warn',

    // Style Rules
    indent: ['error', 2, { SwitchCase: 1 }],
    'linebreak-style': ['error', 'unix'],
    quotes: ['error', 'single', { avoidEscape: true }],
    semi: ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'space-before-blocks': 'error',
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'eol-last': 'error',
    'no-trailing-spaces': 'error',

    // Function Rules
    'func-call-spacing': ['error', 'never'],
    'space-before-function-paren': [
      'error',
      {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always',
      },
    ],

    // Node.js specific
    'node/no-unpublished-require': 'off',
    'node/no-missing-require': 'warn',
    'node/no-extraneous-require': 'warn',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unsupported-features/es-builtins': 'off',
    'node/no-unsupported-features/node-builtins': 'off',
    'node/exports-style': ['warn', 'module.exports'],
    'node/prefer-global/buffer': 'off',
    'node/prefer-global/console': 'off',
    'node/prefer-global/process': 'off',

    // Best Practices
    curly: ['warn', 'all'],
    eqeqeq: ['warn', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-multi-spaces': 'warn',
    'no-multiple-empty-lines': ['warn', { max: 3, maxEOF: 1 }],
    'no-return-assign': 'warn',
    'no-self-compare': 'warn',
    'no-throw-literal': 'warn',
    'no-useless-concat': 'warn',
    'no-useless-return': 'warn',
    'no-process-exit': 'off',
    radix: 'warn',
    yoda: 'warn',
  },

  overrides: [
    {
      files: ['test/**/*.js', '**/*.test.js', '**/*.spec.js'],
      env: {
        mocha: true,
      },
      globals: {
        expect: 'readonly',
      },
      rules: {
        'no-unused-expressions': 'off',
        'security/detect-non-literal-fs-filename': 'off',
        'node/no-unpublished-require': 'off',
      },
    },
    {
      files: ['tests/load/**/*.js'],
      rules: {
        'node/no-missing-import': 'off',
        'node/no-missing-require': 'off',
        'no-undef': 'off',
        'no-prototype-builtins': 'off',
      },
    },
  ],
};
