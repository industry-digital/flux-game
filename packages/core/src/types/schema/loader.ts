/**
 * Schema loader function type definition
 * Pure function that returns a Map of URN to Schema
 */
export type SchemaLoader<URN extends string, Schema> = () => Map<URN, Schema>;
