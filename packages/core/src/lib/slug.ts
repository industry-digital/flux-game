const NON_ALPHANUMERIC_REGEX = /[^a-zA-Z0-9]+/g;

export function sluggify(input: string, sep: string = '-'): string {
  return input.replace(NON_ALPHANUMERIC_REGEX, sep).toLowerCase();
}
