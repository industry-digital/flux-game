import { Self } from '~/types/actor';
import { ScheduledDuration } from '~/types/world/time';
import {
  AbilityURN,
  AnatomyURN,
  EffectURN,
  EntityURN,
  Intrinsic,
  ItemURN,
  SkillURN,
} from '~/types/taxonomy';

export type EffectOriginType =
  | EntityURN
  | SkillURN
  | AbilityURN
  | ItemURN
  | AnatomyURN
  | Intrinsic;

export type EffectOrigin = {
  type: EffectOriginType;
  actor?: EntityURN | Self;
};

/**
 * An AppliedEffect is a temporary state or condition applied to an Entity.
 */
export type AppliedEffect<
  State extends Record<string, any> = Record<string, any>,
> = ScheduledDuration & {

  /**
   * The taxonomic identifier that describes the effect.
   */
  type: EffectURN;

  /**
   * The origin of the effect
   */
  origin: EffectOrigin;

  /**
   * Optional human-friendly description for display purposes.
   */
  summary?: string;

  /**
   * For tracking the state of the effect over time
   */
  state?: State;
};

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
