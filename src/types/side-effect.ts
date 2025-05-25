export type SideEffectInput<
  T extends string = string,
  A extends object = {},
> = {
  id?: string;
  trace?: string;
  ts?: number;
  priority?: number;
  type: T,
  args: A;
};

export type SideEffect<
  T extends string = string,
  A extends object = {},
> = Omit<SideEffectInput<T, A>, 'id' | 'trace' | 'ts' | 'priority' > & {
  id: string;
  trace: string;
  ts: number;
  priority: number;
};
