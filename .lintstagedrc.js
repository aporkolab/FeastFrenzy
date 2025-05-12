module.exports = {
  // Backend JavaScript files
  'backend/**/*.js': [
    'eslint --fix',
    'prettier --write',
    'git add',
  ],
  
  // Frontend TypeScript files
  'frontend/**/*.ts': [
    'prettier --write',
    'git add',
  ],
  
  // Frontend HTML templates
  'frontend/**/*.html': [
    'prettier --write',
    'git add',
  ],
  
  // Frontend SCSS files
  'frontend/**/*.scss': [
    'prettier --write',
    'git add',
  ],
  
  // JSON files
  '**/*.json': [
    'prettier --write',
    'git add',
  ],
  
  // Markdown files
  '**/*.md': [
    'prettier --write',
    'git add',
  ],
  
  // YAML files
  '**/*.{yml,yaml}': [
    'prettier --write',
    'git add',
  ],
};