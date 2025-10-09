/**
 * Shared testing utilities
 *
 * This module provides consistent testing infrastructure across all test suites,
 * ensuring proper Vue app configuration and composable testing patterns.
 *
 * The setup.ts file is automatically loaded by Vitest and configures global
 * warning suppression for clean test output.
 */

export { createTestApp, createComposableTestSuite } from './vue-test-utils';
