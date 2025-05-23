import { AbilityURN, AnatomyURN, EffectURN, EntityURN, ItemURN, SkillURN } from '@flux/taxonomy';
import { Duration } from '@flux/world/time';

export const INTRINSIC = 'intrinsic' as const;
export type Intrinsic = typeof INTRINSIC;

export type AllowedEffectSource =
  | EntityURN
  | SkillURN
  | AbilityURN
  | ItemURN
  | AnatomyURN
  | Intrinsic;

/**
 * An AppliedEffect is a temporary state or condition applied to an Entity.
 */
export interface AppliedEffect<
  O extends AllowedEffectSource = AllowedEffectSource,
  State extends Record<string, any> = Record<string, any>,
> {

  /**
   * The taxonomic identifier that describes the effect.
   */
  type: EffectURN;

  /**
   * The origin of the effect
   */
  origin: O;

  /**
   * The moment the effect was applied (milliseconds since UNIX epoch).
   */
  ts: number;

  /**
   * How long the effect lasts.
   */
  duration: Duration;

  /**
   * Optional human-friendly description for display purposes.
   */
  summary?: string;

  /**
   * For tracking the state of the effect over time
   */
  state?: State;
}

/**
 * Core effect categories for our system
 */
export enum EffectCategory {
  PHYSICAL = 'physical',
  MENTAL = 'mental',
  DIGITAL = 'digital',
  CYBERWARE = 'cyberware',
  SUBSTANCE = 'substance',
  ENVIRONMENTAL = 'environmental',
  SOCIAL = 'social',
}
