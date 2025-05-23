import { Modifier } from '~/types/dice';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';

/**
 * Represents a character ability and its current state
 */
export interface AbilityState {
  /**
   * The moment this ability was last used, expressed as milliseconds since the UNIX epoch
   */
  ts: number;

  /**
   * Cooldown tracking
   */
  cooldown: ModifiableScalarAttribute;

  /**
   * The modifiers affecting this ability
   */
  modifiers: Record<string, Modifier>;
}
