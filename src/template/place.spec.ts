import { describe, it, expect } from 'vitest';
import { renderPlaceDescription, PlaceTemplateProps } from './place';
import { Direction } from '~/types/world/space';
import { createPlace } from '~/worldkit/entity/place';
import { createPlaceSummary } from '~/worldkit/view/place';
import { createActor } from '~/worldkit/entity/actor';
import { ActorType } from '~/types/entity/actor';

describe('place templates', () => {
  describe('renderPlaceDescription', () => {
    it('should render basic place with no actors', () => {
      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:basic',
          name: 'Empty Room',
          description: { base: 'A simple empty room.', emergent: '' },
          exits: {},
        }),
        {},
        {}
      );

      const result = renderPlaceDescription({ place });

      expect(result).toBe(
        '[Empty Room]\n' +
        'A simple empty room.\n' +
        'Exits: none.'
      );
    });

    it('should render place with emergent narrative', () => {
      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:emergent',
          name: 'Mysterious Chamber',
          description: {
            base: 'An ancient stone chamber.',
            emergent: 'Strange runes glow faintly on the walls.',
          },
          exits: {},
        }),
        {},
        {}
      );

      const result = renderPlaceDescription({ place });

      expect(result).toBe(
        '[Mysterious Chamber]\n' +
        'An ancient stone chamber. Strange runes glow faintly on the walls.\n' +
        'Exits: none.'
      );
    });

    it('should render place with single actor', () => {
      const khulani = createActor({
        id: 'flux:actor:npc:khulani',
        name: 'Khulani',
        kind: ActorType.CREATURE,
        description: 'A mysterious figure.',
        location: 'flux:place:test:room',
      });

      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:with-actor',
          name: 'Meeting Room',
          description: { base: 'A quiet meeting space.', emergent: '' },
          exits: {},
        }),
        { 'flux:actor:npc:khulani': khulani },
        {}
      );

      const result = renderPlaceDescription({ place });

      expect(result).toBe(
        '[Meeting Room]\n' +
        'A quiet meeting space.\n' +
        'Also here: Khulani.\n' +
        'Exits: none.'
      );
    });

    it('should render place with multiple actors', () => {
      const actors = {
        'flux:actor:npc:khulani': createActor({
          id: 'flux:actor:npc:khulani',
          name: 'Khulani',
          kind: ActorType.CREATURE,
          description: 'A mysterious figure.',
          location: 'flux:place:test:room',
        }),
        'flux:actor:npc:merchant': createActor({
          id: 'flux:actor:npc:merchant',
          name: 'Merchant',
          kind: ActorType.CREATURE,
          description: 'A local trader.',
          location: 'flux:place:test:room',
        }),
      };

      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:with-actors',
          name: 'Marketplace',
          description: { base: 'A busy trading area.', emergent: '' },
          exits: {},
        }),
        actors,
        {}
      );

      const result = renderPlaceDescription({ place });

      expect(result).toBe(
        '[Marketplace]\n' +
        'A busy trading area.\n' +
        'Also here: Khulani, Merchant.\n' +
        'Exits: none.'
      );
    });

    it('should exclude viewer from actor list', () => {
      const actors = {
        'flux:actor:pc:player': createActor({
          id: 'flux:actor:pc:player',
          name: 'Player',
          kind: ActorType.PC,
          description: 'A player character.',
          location: 'flux:place:test:room',
        }),
        'flux:actor:npc:merchant': createActor({
          id: 'flux:actor:npc:merchant',
          name: 'Merchant',
          kind: ActorType.CREATURE,
          description: 'A local trader.',
          location: 'flux:place:test:room',
        }),
      };

      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:with-viewer',
          name: 'Shop',
          description: { base: 'A small shop.', emergent: '' },
          exits: {},
        }),
        actors,
        {}
      );

      const result = renderPlaceDescription({
        place,
        viewer: 'flux:actor:pc:player',
      });

      expect(result).toBe(
        '[Shop]\n' +
        'A small shop.\n' +
        'Also here: Merchant.\n' +
        'Exits: none.'
      );
    });

    it('should render place with multiple exits', () => {
      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:exits',
          name: 'Crossroads',
          description: { base: 'A junction of paths.', emergent: '' },
          exits: {
            [Direction.NORTH]: {
              direction: Direction.NORTH,
              label: 'path to forest',
              to: 'flux:place:test:forest',
            },
            [Direction.SOUTH]: {
              direction: Direction.SOUTH,
              label: 'road to village',
              to: 'flux:place:test:village',
            },
          },
        }),
        {},
        {}
      );

      const result = renderPlaceDescription({ place });

      expect(result).toBe(
        '[Crossroads]\n' +
        'A junction of paths.\n' +
        'Exits: north, south.'
      );
    });

    it('should render complete place with all elements', () => {
      const actors = {
        'flux:actor:npc:guard': createActor({
          id: 'flux:actor:npc:guard',
          name: 'Guard',
          kind: ActorType.CREATURE,
          description: 'A town guard.',
          location: 'flux:place:test:gate',
        }),
      };

      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:complete',
          name: 'Town Gate',
          description: {
            base: 'A sturdy gate marks the entrance to the town.',
            emergent: 'Torches flicker in the evening light.',
          },
          exits: {
            [Direction.NORTH]: {
              direction: Direction.NORTH,
              label: 'into town',
              to: 'flux:place:test:town',
            },
            [Direction.SOUTH]: {
              direction: Direction.SOUTH,
              label: 'to forest',
              to: 'flux:place:test:forest',
            },
          },
        }),
        actors,
        {}
      );

      const result = renderPlaceDescription({ place });

      expect(result).toBe(
        '[Town Gate]\n' +
        'A sturdy gate marks the entrance to the town. Torches flicker in the evening light.\n' +
        'Also here: Guard.\n' +
        'Exits: north, south.'
      );
    });
  });

  describe('type compatibility', () => {
    it('should maintain correct type for PlaceTemplateProps', () => {
      const place = createPlaceSummary(
        createPlace({
          id: 'flux:place:test:type-check',
          name: 'Type Test',
          description: { base: 'Testing types', emergent: '' },
          exits: {},
        }),
        {},
        {}
      );

      const props: PlaceTemplateProps = { place };
      expect(props.place.name).toBe('Type Test');
    });
  });
});
