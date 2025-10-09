import { toRaw } from 'vue';

export const deepToRaw = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(deepToRaw);

  const raw = toRaw(obj);
  const result: any = {};
  for (const key in raw) {
    if (raw.hasOwnProperty(key)) {
      result[key] = deepToRaw(raw[key]);
    }
  }
  return result;
};
