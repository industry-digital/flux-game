export class SchemaManager<TSchemaType, TUrnType extends string> {

  public constructor(
    private readonly schemas: Map<TUrnType, TSchemaType> = new Map(),
  ) {}

  public getSchema(urn: TUrnType): TSchemaType {
    const schema = this.schemas.get(urn);
    if (!schema) {
      throw new Error(`Schema not found for resource: ${urn}`);
    }
    return schema;
  }

  public getSchemasMatchingPattern(pattern: string | RegExp): TSchemaType[] {
    const output: TSchemaType[] = [];
    for (const [urn, schema] of this.schemas) {
      const regexMatch = pattern instanceof RegExp ? pattern.test(urn) : urn.includes(pattern);
      const strMatch = !regexMatch && typeof pattern === 'string' && urn.includes(pattern);
      if (regexMatch || strMatch) {
        output.push(schema as TSchemaType);
      }
    }
    return output;
  }
}
