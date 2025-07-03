import { NormalizedBipolarValue } from '~/types/entity/attribute';

export enum EcosystemName {
  DESERT_CALDERA = 'flux:eco:desert:caldera',
  ARID_SCRUBLAND = 'flux:eco:scrubland:arid',
  TEMPERATE_GRASSLAND = 'flux:eco:grassland:temperate',
  TEMPERATE_FOREST = 'flux:eco:forest:temperate',
  ALPINE_WOODLAND = 'flux:eco:woodland:alpine',
};

export type EcosystemProfile = {
  temperature: NormalizedBipolarValue;
  moisture: NormalizedBipolarValue;
  elevation: NormalizedBipolarValue;
  vegetation: NormalizedBipolarValue;
};

export const ECOSYSTEM: Record<EcosystemName, EcosystemProfile> = {
  [EcosystemName.DESERT_CALDERA]: {
    temperature: 0.5,
    moisture: 0.5,
    elevation: 0.5,
    vegetation: 0.5,
  },
  [EcosystemName.ARID_SCRUBLAND]: {
    temperature: 0.5,
    moisture: 0.5,
    elevation: 0.5,
    vegetation: 0.5,
  },
  [EcosystemName.TEMPERATE_GRASSLAND]: {
    temperature: 0.5,
    moisture: 0.5,
    elevation: 0.5,
    vegetation: 0.5,
  },
  [EcosystemName.TEMPERATE_FOREST]: {
    temperature: 0.5,
    moisture: 0.5,
    elevation: 0.5,
    vegetation: 0.5,
  },
  [EcosystemName.ALPINE_WOODLAND]: {
    temperature: 0.5,
    moisture: 0.5,
    elevation: 0.5,
    vegetation: 0.5,
  },
};
