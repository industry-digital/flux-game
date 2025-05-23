export enum SessionType {
  CHARACTER_CREATION = 'character:creation',
}

export type InteractiveSessionState<T extends SessionType = SessionType, Data extends object = {}> = {
  type: T;
  data: Data;
};
