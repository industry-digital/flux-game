/**
 * A template is a function that takes an input and returns a string.
 * Templates are used to render human-readable messages that incorporate into Facts.
 * @deprecated Don't collapse all parameters into a single Input object. Unnecessary object allocation.
 */
export type Template<Input = any> = (input: Input) => string;
