import { RootNamespace, TAXONOMY } from '@flux/taxonomy';

/**
 * Base type for all anatomy taxonomic URNs
 */
export type AnatomyUrn = `${RootNamespace}:anatomy:${string}`;

/**
 * All anatomy locations for any entity type
 */
export type Anatomy = AnatomyUrn;

/**
 * Humanoid body part taxonomy
 */
export type HumanAnatomy =
  | `${RootNamespace}:anatomy:human:head`
  | `${RootNamespace}:anatomy:human:torso`
  | `${RootNamespace}:anatomy:human:back`
  | `${RootNamespace}:anatomy:human:left:arm`
  | `${RootNamespace}:anatomy:human:left:arm:hand`
  | `${RootNamespace}:anatomy:human:right:arm`
  | `${RootNamespace}:anatomy:human:right:arm:hand`
  | `${RootNamespace}:anatomy:human:left:leg`
  | `${RootNamespace}:anatomy:human:left:leg:foot`
  | `${RootNamespace}:anatomy:human:right:leg`
  | `${RootNamespace}:anatomy:human:right:leg:foot`;

/**
 * Creates an anatomy URN for a human body part
 */
export function createHumanAnatomyUrn(bodyPart: string): HumanAnatomy {
  return `${TAXONOMY.namespace}:anatomy:human:${bodyPart}` as HumanAnatomy;
}

/**
 * Creates a generic anatomy URN
 */
export function createAnatomyUrn(anatomyPath: string): AnatomyUrn {
  return `${TAXONOMY.namespace}:anatomy:${anatomyPath}` as AnatomyUrn;
}

/**
 * Common human anatomy URNs for convenient access
 */
export const HUMAN_ANATOMY = {
  HEAD: createHumanAnatomyUrn('head'),
  TORSO: createHumanAnatomyUrn('torso'),
  BACK: createHumanAnatomyUrn('back'),
  LEFT_ARM: createHumanAnatomyUrn('left:arm'),
  LEFT_HAND: createHumanAnatomyUrn('left:arm:hand'),
  RIGHT_ARM: createHumanAnatomyUrn('right:arm'),
  RIGHT_HAND: createHumanAnatomyUrn('right:arm:hand'),
  LEFT_LEG: createHumanAnatomyUrn('left:leg'),
  LEFT_FOOT: createHumanAnatomyUrn('left:leg:foot'),
  RIGHT_LEG: createHumanAnatomyUrn('right:leg'),
  RIGHT_FOOT: createHumanAnatomyUrn('right:leg:foot'),
} as const;
