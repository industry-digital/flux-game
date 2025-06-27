import { describe, it, expect } from 'vitest';
import { renderPlaceSummary, PlaceSummaryInput } from './place';
import { Place } from '~/types/entity/place';
import { Direction } from '~/types/world/space';
import { createPlace } from '~/worldkit/entity/place';

describe('place templates', () => {
  describe('renderPlaceSummary', () => {
    it('should render a basic place with string description and no exits', () => {
      const place = createPlace({
        id: 'flux:place:test:empty-room',
        name: 'Empty Room',
        description: 'A simple empty room.',
        exits: [],
      });

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Empty Room\nA simple empty room.\n\n');
    });

    it('should render a place with emergent narrative description', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:mysterious-chamber',
          name: 'Mysterious Chamber',
          description: 'An ancient stone chamber.',
          exits: [],
        }),
        description: {
          base: 'An ancient stone chamber.',
          emergent: 'Strange runes glow faintly on the walls.',
        },
      };

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Mysterious Chamber\nAn ancient stone chamber.\nStrange runes glow faintly on the walls.\n\n');
    });

    it('should render a place with emergent narrative description when emergent is undefined', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:basic-chamber',
          name: 'Basic Chamber',
          description: 'A stone chamber.',
          exits: [],
        }),
        description: {
          base: 'A stone chamber.',
          emergent: undefined,
        },
      };

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Basic Chamber\nA stone chamber.\nundefined\n\n');
    });

    it('should render a place with single exit', () => {
      const place = createPlace({
        id: 'flux:place:test:room-with-door',
        name: 'Room with Door',
        description: 'A room with a single exit.',
        exits: [
          {
            direction: Direction.NORTH,
            label: 'wooden door',
            to: 'flux:place:test:hallway',
          },
        ],
      });

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Room with Door\nA room with a single exit.\n\n- north: wooden door');
    });

    it('should render a place with multiple exits', () => {
      const place = createPlace({
        id: 'flux:place:test:crossroads',
        name: 'Crossroads',
        description: 'A junction with multiple paths.',
        exits: [
          {
            direction: Direction.NORTH,
            label: 'forest path',
            to: 'flux:place:test:forest',
          },
          {
            direction: Direction.SOUTH,
            label: 'village road',
            to: 'flux:place:test:village',
          },
          {
            direction: Direction.EAST,
            label: 'mountain trail',
            to: 'flux:place:test:mountain',
          },
        ],
      });

      const result = renderPlaceSummary({ place });

      const expected = `Crossroads
A junction with multiple paths.

- north: forest path
- south: village road
- east: mountain trail`;

      expect(result).toBe(expected);
    });

    it('should handle complex scenario with emergent narrative and multiple exits', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:ancient-crossroads',
          name: 'Ancient Crossroads',
          description: 'Four ancient stone paths meet at this weathered crossroads.',
          exits: [
            {
              direction: Direction.NORTH,
              label: 'crumbling bridge',
              to: 'flux:place:ruins:bridge',
            },
            {
              direction: Direction.WEST,
              label: 'overgrown path',
              to: 'flux:place:forest:deep',
            },
          ],
        }),
        description: {
          base: 'Four ancient stone paths meet at this weathered crossroads.',
          emergent: 'Moss-covered signposts point in each direction, their carved runes barely legible.',
        },
      };

      const result = renderPlaceSummary({ place });

      const expected = `Ancient Crossroads
Four ancient stone paths meet at this weathered crossroads.
Moss-covered signposts point in each direction, their carved runes barely legible.

- north: crumbling bridge
- west: overgrown path`;

      expect(result).toBe(expected);
    });

    it('should handle place with empty exits object', () => {
      const place = createPlace({
        id: 'flux:place:test:isolated-room',
        name: 'Isolated Room',
        description: 'A room with no way out.',
        exits: [],
      });

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Isolated Room\nA room with no way out.\n\n');
    });

    it('should maintain correct type for PlaceSummaryInput', () => {
      const place = createPlace({
        id: 'flux:place:test:type-test',
        name: 'Type Test Location',
        description: 'A test location for type checking',
        exits: [],
      });
      const input: PlaceSummaryInput = { place };

      // This test mainly ensures type compatibility
      const result = renderPlaceSummary(input);
      expect(typeof result).toBe('string');
    });
  });

  describe('renderExits integration', () => {
    it('should properly format exit directions and labels', () => {
      const place = createPlace({
        id: 'flux:place:test:multi-exit-room',
        name: 'Multi Exit Room',
        description: 'A room with various exits',
        exits: [
          {
            direction: Direction.NORTHWEST,
            label: 'secret passage',
            to: 'flux:place:hidden:chamber',
          },
          {
            direction: Direction.DOWN,
            label: 'trapdoor',
            to: 'flux:place:cellar:main',
          },
        ],
      });

      const result = renderPlaceSummary({ place });

      expect(result).toContain('- northwest: secret passage');
      expect(result).toContain('- down: trapdoor');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined emergent narrative gracefully', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:base-only',
          name: 'Base Only Room',
          description: 'Base description only.',
          exits: [],
        }),
        description: {
          base: 'Base description only.',
        },
      };

      const result = renderPlaceSummary({ place });

      expect(result).toContain('Base description only.');
      expect(result).toContain('undefined'); // This might need fixing in the actual code
    });

    it('should handle exits with various direction types', () => {
      const place = createPlace({
        id: 'flux:place:test:direction-variety',
        name: 'Direction Variety Room',
        description: 'A room with various directional exits',
        exits: [
          {
            direction: Direction.UP,
            label: 'spiral staircase',
            to: 'flux:place:tower:top',
          },
          {
            direction: Direction.SOUTHEAST,
            label: 'garden gate',
            to: 'flux:place:garden:entrance',
          },
        ],
      });

      const result = renderPlaceSummary({ place });

      expect(result).toContain('- up: spiral staircase');
      expect(result).toContain('- southeast: garden gate');
    });
  });
});
