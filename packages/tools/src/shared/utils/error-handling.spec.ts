import { describe, it, expect } from 'vitest';
import {
    getErrorMessage,
    isErrorWithMessage,
    isErrorLike,
    normalizeError,
    attempt,
    attemptAsync
} from './error-handling';

describe('error-handling utilities', () => {
  describe('getErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should return string errors as-is', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should extract message from error-like objects', () => {
      const errorLike = { message: 'Error-like message' };
      expect(getErrorMessage(errorLike)).toBe('Error-like message');
    });

    it('should convert other types to strings', () => {
      expect(getErrorMessage(42)).toBe('42');
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
    });
  });

  describe('isErrorWithMessage', () => {
    it('should return true for Error instances', () => {
      expect(isErrorWithMessage(new Error('test'))).toBe(true);
    });

    it('should return false for non-Error objects', () => {
      expect(isErrorWithMessage({ message: 'test' })).toBe(false);
      expect(isErrorWithMessage('test')).toBe(false);
    });
  });

  describe('isErrorLike', () => {
    it('should return true for objects with message property', () => {
      expect(isErrorLike({ message: 'test' })).toBe(true);
      expect(isErrorLike(new Error('test'))).toBe(true);
    });

    it('should return false for objects without message', () => {
      expect(isErrorLike({})).toBe(false);
      expect(isErrorLike('test')).toBe(false);
      expect(isErrorLike(null)).toBe(false);
    });
  });

  describe('normalizeError', () => {
    it('should return Error objects as-is', () => {
      const error = new Error('test');
      expect(normalizeError(error)).toBe(error);
    });

    it('should convert strings to Error objects', () => {
      const result = normalizeError('test error');
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('test error');
    });

    it('should preserve original error in normalized Error', () => {
      const original = { message: 'test', code: 500 };
      const result = normalizeError(original);
      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('test');
      expect((result as any).originalError).toBe(original);
    });
  });

  describe('attempt', () => {
    it('should return success result for functions that don\'t throw', () => {
      const result = attempt(() => 42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should return error result for functions that throw', () => {
      const result = attempt(() => {
        throw new Error('test error');
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('test error');
      }
    });
  });

  describe('attemptAsync', () => {
    it('should return success result for async functions that don\'t throw', async () => {
      const result = await attemptAsync(async () => 42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });

    it('should return error result for async functions that throw', async () => {
      const result = await attemptAsync(async () => {
        throw new Error('async test error');
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('async test error');
      }
    });
  });
});
