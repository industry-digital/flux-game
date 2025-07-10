#!/usr/bin/env node

// Test ESM import
console.log('🧪 Testing ESM import...');

try {
  // Test named imports
  const { generateWorld, DEFAULT_WORLD_CONFIG, EcosystemName } = await import('./dist/esm/index.js');

  console.log('✅ ESM import() successful');

  // Test specific exports
  if (typeof generateWorld === 'function') {
    console.log('✅ generateWorld function available');
  } else {
    console.log('❌ generateWorld function missing');
    process.exit(1);
  }

  if (typeof DEFAULT_WORLD_CONFIG === 'object') {
    console.log('✅ DEFAULT_WORLD_CONFIG available');
  } else {
    console.log('❌ DEFAULT_WORLD_CONFIG missing');
    process.exit(1);
  }

  if (EcosystemName) {
    console.log('✅ EcosystemName enum available');
  } else {
    console.log('❌ EcosystemName enum missing');
    process.exit(1);
  }

  // Test namespace import
  const fluxGameNamespace = await import('./dist/esm/index.js');
  if (fluxGameNamespace.generateWorld) {
    console.log('✅ Namespace import works');
  } else {
    console.log('❌ Namespace import failed');
    process.exit(1);
  }

  console.log('🎉 ESM build test PASSED');

} catch (error) {
  console.error('❌ ESM test FAILED:', error.message);
  process.exit(1);
}
