import { describe, it, expect } from 'vitest';
import { merge } from './lang';

describe('merge', () => {
  it('should merge two simple objects', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { c: 3, d: 4 };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ a: 1, b: 2, c: 3, d: 4 });
  });

  it('should perform deep merge of nested objects', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } };
    const obj2 = { b: { e: 4, f: 5 }, g: 6 };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({
      a: 1,
      b: { c: 2, d: 3, e: 4, f: 5 },
      g: 6
    });
  });

  it('should overwrite primitive values', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: 10, c: 3 };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ a: 10, b: 2, c: 3 });
  });

  it('should skip undefined values when target has existing value', () => {
    const obj1 = { a: 1, b: 2 };
    const obj2 = { a: undefined, c: 3 };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should assign undefined values when target does not have the key', () => {
    const obj1 = { a: 1 };
    const obj2 = { b: undefined };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ a: 1, b: undefined });
  });

  it('should handle arrays by replacement, not merging', () => {
    const obj1 = { arr: [1, 2, 3] };
    const obj2 = { arr: [4, 5] };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ arr: [4, 5] });
  });

  it('should handle null values', () => {
    const obj1 = { a: 1, b: { c: 2 } };
    const obj2 = { b: null };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ a: 1, b: null });
  });

  it('should handle Date objects as property values by replacement', () => {
    const date1 = new Date('2023-01-01');
    const date2 = new Date('2023-12-31');
    const obj1 = { date: date1 };
    const obj2 = { date: date2 };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ date: date2 });
  });

  it('should handle RegExp objects as property values by replacement', () => {
    const regex1 = /abc/g;
    const regex2 = /xyz/i;
    const obj1 = { pattern: regex1 };
    const obj2 = { pattern: regex2 };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ pattern: regex2 });
  });

  it('should merge multiple source objects', () => {
    const obj1 = { a: 1 };
    const obj2 = { b: 2 };
    const obj3 = { c: 3 };
    const result = merge({}, obj1, obj2, obj3);

    expect(result).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should handle deeply nested objects', () => {
    const obj1 = {
      level1: {
        level2: {
          level3: {
            value: 'original'
          }
        }
      }
    };
    const obj2 = {
      level1: {
        level2: {
          level3: {
            newValue: 'added'
          }
        }
      }
    };
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            value: 'original',
            newValue: 'added'
          }
        }
      }
    });
  });

  it('should mutate the target object', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    const result = merge(target, source);

    expect(target).toBe(result);
    expect(target).toEqual({ a: 1, b: 2 });
  });

  it('should skip null and undefined sources', () => {
    const obj1 = { a: 1 };
    const result = merge({}, obj1, null, undefined, { b: 2 });

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should throw error for non-plain-object target', () => {
    expect(() => merge(null as any, { a: 1 })).toThrow('Target must be a plain object');
    expect(() => merge(undefined as any, { a: 1 })).toThrow('Target must be a plain object');
    expect(() => merge('string' as any, { a: 1 })).toThrow('Target must be a plain object');
    expect(() => merge(123 as any, { a: 1 })).toThrow('Target must be a plain object');
    expect(() => merge([] as any, { a: 1 })).toThrow('Target must be a plain object');
    expect(() => merge(new Date() as any, { a: 1 })).toThrow('Target must be a plain object');
    expect(() => merge(/regex/ as any, { a: 1 })).toThrow('Target must be a plain object');
  });

  it('should throw error for non-plain-object sources', () => {
    expect(() => merge({}, 'string' as any)).toThrow('All source arguments must be plain objects');
    expect(() => merge({}, 123 as any)).toThrow('All source arguments must be plain objects');
    expect(() => merge({}, [] as any)).toThrow('All source arguments must be plain objects');
    expect(() => merge({}, new Date() as any)).toThrow('All source arguments must be plain objects');
    expect(() => merge({}, /regex/ as any)).toThrow('All source arguments must be plain objects');
    expect(() => merge({}, { a: 1 }, 'invalid' as any)).toThrow('All source arguments must be plain objects');
  });

  it('should handle objects with Object.create(null)', () => {
    const obj1 = Object.create(null);
    obj1.a = 1;
    const obj2 = Object.create(null);
    obj2.b = 2;
    const result = merge({}, obj1, obj2);

    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should handle function properties', () => {
    const fn1 = () => 'function1';
    const fn2 = () => 'function2';
    const obj1 = { func: fn1 };
    const obj2 = { func: fn2 };
    const result = merge({}, obj1, obj2);

    expect((result as any).func).toBe(fn2);
  });

  it('should handle complex real-world scenario like Actor creation', () => {
    const entity = { id: 'test-id', type: 'ACTOR' };
    const defaults = {
      name: 'Default Name',
      stats: { STR: 10, DEX: 10 },
      equipment: { weapon: null }
    };
    const input = {
      name: 'Custom Name',
      stats: { STR: 15 },
      level: 5
    };

    const result = merge({}, entity, defaults, input);

    expect(result).toEqual({
      id: 'test-id',
      type: 'ACTOR',
      name: 'Custom Name',
      stats: { STR: 15, DEX: 10 },
      equipment: { weapon: null },
      level: 5
    });
  });

  it('should preserve property descriptors for own properties only', () => {
    const obj1 = { a: 1 };
    const obj2 = {};
    Object.defineProperty(obj2, 'b', {
      value: 2,
      enumerable: true,
      writable: true,
      configurable: true
    });

    const result = merge({}, obj1, obj2);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('should handle empty objects', () => {
    const result = merge({}, {}, {});
    expect(result).toEqual({});
  });

  it('should handle objects with symbol keys (should be ignored)', () => {
    const sym = Symbol('test');
    const obj1 = { a: 1, [sym]: 'symbol value' };
    const obj2 = { b: 2 };
    const result = merge({}, obj1, obj2);

    // Symbol properties should not be copied in for...in loop
    expect(result).toEqual({ a: 1, b: 2 });
    expect((result as any)[sym]).toBeUndefined();
  });
});
