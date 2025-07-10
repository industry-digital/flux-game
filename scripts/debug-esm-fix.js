const testContent = `export * from './types/index.js';
export * from './lib/taxonomy';
export * from './worldkit/entity';
export * from './worldkit/view';`;

console.log('Original content:');
console.log(testContent);
console.log('\n---\n');

const regex = /from ['"](\.\.[\/\\][^'"]*|\.\/[^'"]*?)['"](?!\.js)/g;
let match;
while ((match = regex.exec(testContent)) !== null) {
  console.log('Match found:', match[0]);
  console.log('Import path:', match[1]);
}

console.log('\n---\n');

const fixed = testContent.replace(regex, (match, importPath) => {
  console.log('Processing:', match, 'Import path:', importPath);
  if (importPath.match(/\.[a-zA-Z0-9]+$/)) {
    console.log('  -> Has extension, skipping');
    return match;
  }
  console.log('  -> Adding .js extension');
  return match.replace(importPath, importPath + '.js');
});

console.log('Fixed content:');
console.log(fixed);
