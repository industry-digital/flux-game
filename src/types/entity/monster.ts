import { AbstractEntity, EntityType } from './entity';
import type { ParsedURN } from '~/lib/entity/urn';
import { Character } from './character';

/**
 * A Monster represents a non-player hostile entity in the game world.
 * It shares all the characteristics of a Character but is specifically typed as EntityType.MONSTER.
 * This allows the simulation systems to treat it differently for AI behavior, combat, and world events.
 */
export type Monster = Omit<Character, 'id'> & {
  /**
   * The unique identifier for this monster.
   * Always of type EntityType.MONSTER.
   */
  id: ParsedURN<EntityType.MONSTER>;
};

/**
 * The input type for creating a new Monster, containing only the required fields
 * that need to be provided when creating a Monster.
 */
export type MonsterInput = Omit<Monster, keyof AbstractEntity<EntityType.MONSTER>>;
