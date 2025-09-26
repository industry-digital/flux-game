const fs = require('fs');
const path = require('path');

function fixESMExtensions(dir) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      fixESMExtensions(fullPath);
    } else if (file.name.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');

      // Fix relative imports that don't have .js extensions
      // Match patterns like: from './lib/taxonomy' or from '../types/index'
      content = content.replace(
        /from ['"](\.\.[\/\\][^'"]*|\.\/[^'"]*?)['"](?!\.js)/g,
        (match, importPath) => {
          // Don't add .js if it already has a file extension
          if (importPath.match(/\.[a-zA-Z0-9]+$/)) {
            return match;
          }

          // Check if the import path points to a directory with an index.js file
          const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
          if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
            const indexPath = path.join(resolvedPath, 'index.js');
            if (fs.existsSync(indexPath)) {
              return match.replace(importPath, importPath + '/index.js');
            }
          }

          return match.replace(importPath, importPath + '.js');
        }
      );

      // Fix dynamic imports too
      content = content.replace(
        /import\(['"](\.\.[\/\\].*?|\.\/.*?)['"](?!\.js)\)/g,
        (match, importPath) => {
          if (importPath.match(/\.[a-zA-Z0-9]+$/)) {
            return match;
          }

          // Check if the import path points to a directory with an index.js file
          const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
          if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
            const indexPath = path.join(resolvedPath, 'index.js');
            if (fs.existsSync(indexPath)) {
              return match.replace(importPath, importPath + '/index.js');
            }
          }

          return match.replace(importPath, importPath + '.js');
        }
      );

      fs.writeFileSync(fullPath, content);
    }
  }
}

// Fix ESM build
fixESMExtensions(path.join(__dirname, '../dist/esm'));
console.log('✅ Fixed ESM import extensions');
