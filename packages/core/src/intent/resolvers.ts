import { Actor } from '~/types/entity/actor';
import { Item, Weapon } from '~/types/entity/item';
import { Place } from '~/types/entity/place';
import { Intent } from '~/types/intent';
import { ActorURN, ItemURN, PlaceURN } from '~/types/taxonomy';
import { TransformerContext } from '~/types/handler';

class TrieNode {
  children: Map<string, TrieNode> = new Map();
  actorIds: Set<ActorURN> = new Set(); // Actors whose names have this prefix

  // Add an actor ID to this node and all parent nodes
  addActor(actorId: ActorURN) {
    this.actorIds.add(actorId);
  }

  // Get all actors with this prefix
  getActors(): ActorURN[] {
    return Array.from(this.actorIds);
  }
}

class ActorTrie {
  private root = new TrieNode();

  // Insert an actor into the trie
  insert(actorName: string, actorId: ActorURN) {
    const lowerName = actorName.toLowerCase();
    let current = this.root;

    // Add actor to root (matches empty prefix)
    current.addActor(actorId);

    // Build trie path and add actor to each prefix node
    for (let i = 0; i < lowerName.length; i++) {
      const char = lowerName[i];

      if (!current.children.has(char)) {
        current.children.set(char, new TrieNode());
      }

      current = current.children.get(char)!;
      current.addActor(actorId);
    }
  }

  // Find all actors with given prefix - O(prefix_length + results)
  findByPrefix(prefix: string, minLength: number = 2): ActorURN[] {
    if (prefix.length < minLength) {
      return [];
    }

    const lowerPrefix = prefix.toLowerCase();
    let current = this.root;

    // Navigate to prefix node
    for (const char of lowerPrefix) {
      if (!current.children.has(char)) {
        return []; // Prefix not found
      }
      current = current.children.get(char)!;
    }

    return current.getActors();
  }
}

export type EntityResolverApi = {
  /**
   * Convert a specific token to an Actor
   * @param intent - The intent containing location context
   * @param token - The specific token to resolve (e.g., "alice", "bob")
   * @param matchLocation - Whether to filter by actor's location (default: true)
   */
  resolveActor: (intent: Intent, token: string, matchLocation?: boolean) => Actor | undefined;

  /**
   * Convert a token to a Place, or return current location if no token provided
   * @param intent - The intent containing current location
   * @param token - Optional token to resolve as place name
   */
  resolvePlace: (intent: Intent, token?: string) => Place | undefined;

  /**
   * Convert a token to an Item from actor's inventory
   * @param intent - The intent containing actor context
   * @param token - The token to resolve as item name
   */
  resolveItem: (intent: Intent, token: string) => Item | undefined;

  /**
   * Convert a token to an Item from actor's inventory (specialized version)
   * @param intent - The intent containing actor context
   * @param token - The token to resolve as item name
   */
  resolveInventoryItem: (intent: Intent, token: string) => Item | undefined;

  /**
   * Get the currently equipped weapon, optionally validating against a token
   * @param intent - The intent containing actor context
   * @param token - Optional token to validate weapon name
   */
  resolveEquippedWeapon: (intent: Intent, token?: string) => Weapon | undefined;
};

type EntityResolverConfig = {
  prefixMatchThreshold: number;
};

const DEFAULT_ENTITY_RESOLVER_CONFIG: EntityResolverConfig = {
  prefixMatchThreshold: 3,
};

export const createEntityResolverApi = (
  context: TransformerContext,
  {
    prefixMatchThreshold,
  }: EntityResolverConfig = DEFAULT_ENTITY_RESOLVER_CONFIG,
): EntityResolverApi => {
  const { world } = context;

  // Build trie and other lookup structures
  const actorTrie = new ActorTrie();
  const actorNameCache = new Map<ActorURN, string>();
  const exactNameLookup = new Map<string, ActorURN>();
  const actorsByLocation = new Map<PlaceURN, ActorURN[]>();

  // Single pass to build all data structures
  for (let actorId in world.actors) {
    const actor = world.actors[actorId as ActorURN];
    const lowerName = actor.name.toLowerCase();

    // Cache lowercased name
    actorNameCache.set(actor.id, lowerName);

    // Build exact name lookup
    exactNameLookup.set(lowerName, actor.id);

    // Insert into trie
    actorTrie.insert(actor.name, actor.id);

    // Group by location
    const locationActors = actorsByLocation.get(actor.location) || [];
    locationActors.push(actor.id);
    actorsByLocation.set(actor.location, locationActors);
  }

  const findActorByToken = (token: string, location: PlaceURN, matchLocation: boolean): Actor | undefined => {
    const lowerToken = token.toLowerCase();

    // First, check if token looks like an ActorURN and resolve it directly
    if (lowerToken.startsWith('flux:actor:')) {
      const actor = world.actors[lowerToken as ActorURN];
      if (actor && (!matchLocation || location === actor.location)) {
        return actor; // Direct URN match
      }
    }

    // Fast path: Check exact matches first using O(1) lookup
    const exactMatchId = exactNameLookup.get(lowerToken);
    if (exactMatchId) {
      const actor = world.actors[exactMatchId];
      if (!matchLocation || location === actor.location) {
        return actor; // Immediate return for exact match
      }
    }

    let bestMatch: Actor | undefined = undefined;
    let bestScore = 0;

    // O(log N) prefix matching using trie
    const candidateIds = actorTrie.findByPrefix(lowerToken, 2);

    for (const actorId of candidateIds) {
      const actor = world.actors[actorId];
      const inSameLocation = location === actor.location;

      // Skip if location filtering is enabled and actor is elsewhere
      if (matchLocation && !inSameLocation) {
        continue;
      }

      // Calculate match score based on prefix length
      const actorName = actorNameCache.get(actorId)!;

      // Find actual prefix length (how much of token matches actor name)
      let prefixLength = 0;
      const maxLen = Math.min(lowerToken.length, actorName.length, prefixMatchThreshold);

      for (let i = 0; i < maxLen; i++) {
        if (lowerToken[i] === actorName[i]) {
          prefixLength = i + 1;
        } else {
          break;
        }
      }

      // Only consider if we have a meaningful prefix match
      if (prefixLength < 2) {
        continue;
      }

      let score = prefixLength;
      if (inSameLocation) score += 100; // Location bonus
      // Removed noun bonus - no longer using NLP categorization

      if (score > bestScore) {
        bestMatch = actor;
        bestScore = score;
      }
    }

    return bestMatch;
  };

  const resolveActor = (intent: Intent, token: string, matchLocation = true): Actor | undefined => {
    // Direct token-to-actor resolution
    return findActorByToken(token, intent.location, matchLocation);
  };

  const resolveItem = (intent: Intent, token: string): Item | undefined => {
    // Search through the actor's inventory, equipment
    return undefined;
  };

  const resolvePlace = (intent: Intent, token?: string): Place | undefined => {
    if (!token) {
      // Default to current location when no token provided
      return world.places[intent.location];
    }

    // TODO: Implement place resolution by token
    // For now, just return current location for any token
    return world.places[intent.location];
  };

  const resolveInventoryItem = (intent: Intent, token: string): Item | undefined => {
    throw new Error('Not implemented');
  };

  const resolveEquippedWeapon = (intent: Intent, token?: string): Weapon | undefined => {
    const actor = context.world.actors[intent.actor as ActorURN];
    if (!actor) {
      return undefined;
    }

    // If token provided, could validate it matches the equipped weapon name
    // For now, ignore token and return currently equipped weapon
    const weaponId = context.equipmentApi.getEquippedWeapon(actor);
    if (!weaponId) {
      return undefined;
    }

    const weapon = actor.inventory.items[weaponId as ItemURN];
    if (!weapon) {
      return undefined;
    }

    return weapon! as Weapon;
  }

  return {
    resolveActor,
    resolveItem,
    resolvePlace,
    resolveInventoryItem,
    resolveEquippedWeapon,
  };
};
