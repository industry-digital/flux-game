import { Taxonomy, ArmorSchemaURN } from '~/types/taxonomy';
import { Equippable } from '~/types/schema/equipment';
import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { PhysicalEntitySchema } from '~/types/schema/schema';

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
export type ArmorSchema = PhysicalEntitySchema<ArmorSchemaURN> & Equippable & {

  /**
   * The anatomical locations this item occupies while equipped.
   */
  components: Record<Taxonomy.Anatomy, ArmorComponentSpecification>;

  /**
   * The armor's resistance to various damage types
   */
  resists: Partial<Record<Taxonomy.Damage, NormalizedValueBetweenZeroAndOne>>;
}
