import { Actor } from '~/types/entity/actor';
import { Item } from '~/types/entity/item';
import { Place } from '~/types/entity/place';
import { Intent, WorldProjection } from '~/types/handler';
import { ActorURN, PlaceURN } from '~/types/taxonomy';

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
  resolveActor: (intent: Intent, matchLocation?: boolean) => Actor | undefined;
  resolveItem: (intent: Intent) => Item | undefined;
  resolvePlace: (intent: Intent) => Place | undefined;
};

type EntityResolverConfig = {
  prefixMatchThreshold: number;
};

const DEFAULT_ENTITY_RESOLVER_CONFIG: EntityResolverConfig = {
  prefixMatchThreshold: 3,
};

export const createEntityResolverApi = (
  world: WorldProjection,
  {
    prefixMatchThreshold,
  }: EntityResolverConfig = DEFAULT_ENTITY_RESOLVER_CONFIG,
): EntityResolverApi => {
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

  const resolveActor = (intent: Intent, matchLocation = true): Actor | undefined => {
    // ASSUMPTION: Server provides tokens as Set<string> with duplicates removed and 1-char tokens filtered
    // Fast path: Check exact matches first using O(1) lookup
    for (const token of intent.tokens) {
      const exactMatchId = exactNameLookup.get(token);
      if (exactMatchId) {
        const actor = world.actors[exactMatchId];
        if (!matchLocation || intent.location === actor.location) {
          return actor; // Immediate return for exact match
        }
      }
    }

    let bestMatch: Actor | undefined = undefined;
    let bestScore = 0;

    // O(log N) prefix matching using trie
    for (const token of intent.tokens) {
      // Find all actors with this token as prefix - O(token_length + results)
      const candidateIds = actorTrie.findByPrefix(token, 2);

      for (const actorId of candidateIds) {
        const actor = world.actors[actorId];
        const inSameLocation = intent.location === actor.location;

        // Skip if location filtering is enabled and actor is elsewhere
        if (matchLocation && !inSameLocation) {
          continue;
        }

        // Calculate match score based on prefix length
        const actorName = actorNameCache.get(actorId)!;

        // Find actual prefix length (how much of token matches actor name)
        let prefixLength = 0;
        const maxLen = Math.min(token.length, actorName.length, prefixMatchThreshold);

        for (let i = 0; i < maxLen; i++) {
          if (token[i] === actorName[i]) {
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
    }

    return bestMatch;
  };

  const resolveItem = (intent: Intent): Item | undefined => {
    return undefined;
  };

  const resolvePlace = (intent: Intent): Place | undefined => {
    return undefined;
  };

  return {
    resolveActor,
    resolveItem,
    resolvePlace,
  };
};
