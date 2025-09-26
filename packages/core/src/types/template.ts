/**
 * A template is a function that takes an input and returns a string.
 * Templates are used to render human-readable messages that incorporate into Facts.
 */
export type Template<Input = any> = (input: Input) => string;
