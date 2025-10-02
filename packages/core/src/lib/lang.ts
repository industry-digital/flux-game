
/**
 * Works like Lodash merge - performs a deep merge of plain objects.
 * Recursively merges own and inherited enumerable string keyed properties of source
 * objects into the destination object. Source properties that resolve to undefined
 * are skipped if a destination value exists. Plain object properties are merged
 * recursively. Other value types are overridden by assignment.
 * Source objects are applied from left to right. Subsequent sources overwrite property
 * assignments of previous sources.
 *
 * INVARIANT: All arguments (target and sources) must be plain objects.
 *
 * @param target The destination plain object
 * @param sources The source plain objects
 * @returns The destination object
 * @throws {TypeError} If target or any source is not a plain object
 */
export const merge = <T extends Record<string, any>>(target: T, ...sources: any[]): T => {
  if (!isPlainObject(target)) {
    throw new TypeError('Target must be a plain object');
  }

  for (const source of sources) {
    if (source == null) continue; // Skip null/undefined sources

    if (!isPlainObject(source)) {
      throw new TypeError('All source arguments must be plain objects');
    }

    mergeObject(target, source);
  }

  return target;
};

/**
 * Helper function to determine if a value is a plain object
 */
function isPlainObject(value: any): value is Record<string, any> {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  // Check if it's a plain object (not an array, date, regex, etc.)
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  // If it has no prototype (Object.create(null))
  if (Object.getPrototypeOf(value) === null) {
    return true;
  }

  // Check if it's a plain object with Object.prototype as its prototype
  let proto = value;
  while (Object.getPrototypeOf(proto) !== null) {
    proto = Object.getPrototypeOf(proto);
  }

  return Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Recursively merge source object into target object
 */
function mergeObject(target: Record<string, any>, source: Record<string, any>): void {
  for (const key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      continue; // Skip inherited properties
    }

    const sourceValue = source[key];
    const targetValue = target[key];

    // Skip undefined source values if target has a value
    if (sourceValue === undefined && key in target) {
      continue;
    }

    // If both values are plain objects, merge recursively
    if (isPlainObject(targetValue) && isPlainObject(sourceValue)) {
      mergeObject(targetValue, sourceValue);
    } else {
      // Otherwise, assign the source value to target
      target[key] = sourceValue;
    }
  }
}
