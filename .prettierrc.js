module.exports = {
  // Formatting Options
  semi: true,
  trailingComma: 'es5',
  singleQuote: true,
  printWidth: 80,
  tabWidth: 2,
  useTabs: false,
  
  // Bracket Options
  bracketSpacing: true,
  bracketSameLine: false,
  
  // Arrow Functions
  arrowParens: 'avoid',
  
  // HTML/Angular specific
  htmlWhitespaceSensitivity: 'css',
  
  // Overrides for specific file types
  overrides: [
    {
      files: '*.json',
      options: {
        printWidth: 120,
      },
    },
    {
      files: '*.html',
      options: {
        printWidth: 120,
        htmlWhitespaceSensitivity: 'ignore',
      },
    },
    {
      files: '*.scss',
      options: {
        singleQuote: false,
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'always',
      },
    },
    {
      files: '*.ts',
      options: {
        parser: 'typescript',
      },
    },
    {
      files: '*.js',
      options: {
        parser: 'babel',
      },
    },
  ],
};