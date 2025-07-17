export enum Need {
  FOOD = 'food',
  WATER = 'water',
  SHELTER = 'shelter',
  SAFETY = 'safety',
  SOCIAL = 'social',
}

export type CreatureSchema = {
  name: { singular: string, plural?: string };
  description: (name: string) => string;




  needs: Record<Need,
};
