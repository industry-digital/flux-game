#!/usr/bin/env node

// Test CommonJS import
console.log('🧪 Testing CommonJS import...');

try {
  const fluxGame = require('./dist/cjs/index.js');

  // Test that we can access exports
  console.log('✅ CommonJS require() successful');

  // Test specific exports
  if (typeof fluxGame.generateWorld === 'function') {
    console.log('✅ generateWorld function available');
  } else {
    console.log('❌ generateWorld function missing');
    process.exit(1);
  }

  if (typeof fluxGame.DEFAULT_WORLD_CONFIG === 'object') {
    console.log('✅ DEFAULT_WORLD_CONFIG available');
  } else {
    console.log('❌ DEFAULT_WORLD_CONFIG missing');
    process.exit(1);
  }

  if (fluxGame.EcosystemName) {
    console.log('✅ EcosystemName enum available');
  } else {
    console.log('❌ EcosystemName enum missing');
    process.exit(1);
  }

  console.log('🎉 CommonJS build test PASSED');

} catch (error) {
  console.error('❌ CommonJS test FAILED:', error.message);
  process.exit(1);
}
