import { Taxonomy } from '../taxonomy';
import { EquipmentMixin } from './equipment';
import { NormalizedValueBetweenZeroAndOne } from '../entity/attribute';

/**
 * Represents a physical component of an armor piece
 */
export type ArmorComponentSpecification = {
  /**
   * The max natural HP of this component
   */
  hp: number;

  /**
   * Coverage provided by this component (0.0 to 1.0)
   * Determines chance to intercept attacks
   */
  coverage: NormalizedValueBetweenZeroAndOne;
};

/**
 * Complete specification for an armor item
 */
export interface ArmorSchema extends EquipmentMixin {

  /**
   * The anatomical locations this item occupies while equipped.
   */
  fit: Record<Taxonomy.Anatomy, ArmorComponentSpecification>;

  /**
   * The armor's resistance to various damage types
   */
  resists?: Record<Taxonomy.Damage, NormalizedValueBetweenZeroAndOne>;
}
