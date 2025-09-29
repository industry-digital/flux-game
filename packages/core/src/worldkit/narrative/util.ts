import { NarrativeItem, Perspective } from '~/types/narrative';

export const toPossessive = (name: string) => {
  return name.endsWith('s') ? `${name}'` : `${name}'s`;
}

export const createNarrativeItem = (
  self?: string,
  observer?: string,
  type?: 'info' | 'warning' | 'error' | 'success',
  delay?: number,
): NarrativeItem => {
  return {
    [Perspective.SELF]: self,
    [Perspective.OBSERVER]: observer,
    type,
    delay,
  };
};
