/**
 * Override via declaration merging
 */
export type SideEffectType = any;

export type SideEffectInput<T, A> = {
  id?: string;
  trace?: string;
  ts?: number;
  type: T;
  args: A;
};

export type SideEffect<T, A> = Omit<SideEffectInput<T, A>, 'id' | 'trace' | 'ts'> & {
  id: string;
  trace: string;
  ts: number;
};
