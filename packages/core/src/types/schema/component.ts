import { AbilitySchemaURN, Taxonomy } from '~/types/taxonomy';
import { Equippable } from '~/types/schema/equipment';
import { AbstractItemSchema } from '~/types/schema/item';
import { StaticModifier } from '~/types/modifier';

/**
 * A Component is a physical item that is *permanently mounted* to a shell, unless
 * removed via the workbench. It is *not* equipment that can be removed and re-equipped
 * freely.
 *
 * Think of it like a ship module from EVE Online.
 */
export type ComponentSchema  =
& AbstractItemSchema<'component'>
& Equippable
& {

  /**
   * The anatomical locations this item occupies while the weapon is equipped.
   */
  fit: Partial<Record<Taxonomy.Anatomy, 1>>;

  /**
   * The power draw of the component in watts
   * Directly counteracts the actor's peak power output
   * Free Power = Peak Power Output - (sum of all component power draw)
   */
  powerDraw: number;

  /**
   * The abilities that the component provides to the actor while mounted.
   */
  abilities: AbilitySchemaURN[];

  /**
   * The various static modifiers that the component provides to the actor while mounted.
   */
  staticModifiers: StaticModifier[];
};
