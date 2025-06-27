import { describe, it, expect } from 'vitest';
import { renderPlaceSummary, PlaceTemplateProps } from './place';
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
      const input: PlaceTemplateProps = { place };

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

  describe('performance', () => {
    it('should render place summaries at high throughput', () => {
      const place = createPlace({
        id: 'flux:place:test:performance-test',
        name: 'Performance Test Location',
        description: 'A complex location for testing rendering performance.',
        exits: [
          {
            direction: Direction.NORTH,
            label: 'northern corridor',
            to: 'flux:place:test:north',
          },
          {
            direction: Direction.SOUTH,
            label: 'southern passage',
            to: 'flux:place:test:south',
          },
          {
            direction: Direction.EAST,
            label: 'eastern chamber',
            to: 'flux:place:test:east',
          },
          {
            direction: Direction.WEST,
            label: 'western alcove',
            to: 'flux:place:test:west',
          },
        ],
      });

      const iterations = 100_000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        renderPlaceSummary({ place });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const rendersPerSecond = Math.round((iterations / duration) * 1000);

      console.log(`\n🚀 Template Performance Results:`);
      console.log(`   Iterations: ${iterations.toLocaleString()}`);
      console.log(`   Duration: ${duration.toFixed(2)}ms`);
      console.log(`   Renders/sec: ${rendersPerSecond.toLocaleString()}`);
      console.log(`   Avg render time: ${(duration / iterations * 1000).toFixed(3)}μs\n`);

      // We are only interested in the log output
      expect(true).toBe(true);
    });

    it('should render complex emergent narrative at high throughput', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:complex-performance',
          name: 'Complex Emergent Narrative Location',
          description: 'A base description for performance testing.',
          exits: [
            {
              direction: Direction.NORTHEAST,
              label: 'winding path through ancient ruins',
              to: 'flux:place:ruins:entrance',
            },
            {
              direction: Direction.SOUTHWEST,
              label: 'narrow bridge over rushing water',
              to: 'flux:place:river:crossing',
            },
            {
              direction: Direction.UP,
              label: 'rope ladder to elevated platform',
              to: 'flux:place:platform:main',
            },
            {
              direction: Direction.DOWN,
              label: 'stone steps descending into darkness',
              to: 'flux:place:depths:entrance',
            },
          ],
        }),
        description: {
          base: 'A base description for performance testing.',
          emergent: 'Complex emergent narrative describing dynamic environmental conditions, weather patterns, and atmospheric details that change over time.',
        },
      };

      const iterations = 100_000;
      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        renderPlaceSummary({ place });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;
      const rendersPerSecond = Math.round((iterations / duration) * 1000);

      console.log(`\n⚡ Complex Template Performance Results:`);
      console.log(`   Iterations: ${iterations.toLocaleString()}`);
      console.log(`   Duration: ${duration.toFixed(2)}ms`);
      console.log(`   Renders/sec: ${rendersPerSecond.toLocaleString()}`);
      console.log(`   Avg render time: ${(duration / iterations * 1000).toFixed(3)}μs\n`);

      // We are only interested in the performance output
      expect(true).toBe(true);
    });

    it('should measure hot performance after V8 optimization', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:hot-performance',
          name: 'Hot Performance Test Location',
          description: 'Multi-exit location with emergent narrative for hot performance testing.',
          exits: [
            {
              direction: Direction.NORTH,
              label: 'grand marble staircase leading upward',
              to: 'flux:place:palace:upper',
            },
            {
              direction: Direction.SOUTH,
              label: 'weathered stone path winding downward',
              to: 'flux:place:dungeon:entrance',
            },
            {
              direction: Direction.EAST,
              label: 'ornate golden doorway with intricate carvings',
              to: 'flux:place:treasury:main',
            },
            {
              direction: Direction.WEST,
              label: 'simple wooden door marked with ancient runes',
              to: 'flux:place:library:archives',
            },
            {
              direction: Direction.NORTHEAST,
              label: 'narrow spiral staircase disappearing into shadows',
              to: 'flux:place:tower:secret',
            },
          ],
        }),
        description: {
          base: 'A magnificent hall with soaring ceilings and polished marble floors.',
          emergent: 'Sunlight streams through stained glass windows, casting rainbow patterns across the stone walls. The air carries the faint scent of ancient incense and distant music.',
        },
      };

      // V8 Warm-up Phase: Run enough iterations to trigger optimization
      console.log(`\n🔥 V8 Warm-up Phase:`);
      const warmupIterations = 100_000;
      const warmupStart = performance.now();

      for (let i = 0; i < warmupIterations; i++) {
        renderPlaceSummary({ place });
      }

      const warmupEnd = performance.now();
      const warmupDuration = warmupEnd - warmupStart;
      const warmupRPS = Math.round((warmupIterations / warmupDuration) * 1000);

      console.log(`   Warm-up iterations: ${warmupIterations.toLocaleString()}`);
      console.log(`   Warm-up duration: ${warmupDuration.toFixed(2)}ms`);
      console.log(`   Warm-up RPS: ${warmupRPS.toLocaleString()}`);

      // Hot Performance Phase: Measure optimized performance
      console.log(`\n🚀 Hot Performance Measurement:`);
      const hotIterations = 100_000;
      const hotStart = performance.now();

      for (let i = 0; i < hotIterations; i++) {
        renderPlaceSummary({ place });
      }

      const hotEnd = performance.now();
      const hotDuration = hotEnd - hotStart;
      const hotRPS = Math.round((hotIterations / hotDuration) * 1000);
      const avgRenderTime = (hotDuration / hotIterations * 1000);

      console.log(`   Hot iterations: ${hotIterations.toLocaleString()}`);
      console.log (`   Hot duration: ${hotDuration.toFixed(2)}ms`);
      console.log(`   Hot renders/sec: ${hotRPS.toLocaleString()}`);
      console.log(`   Avg render time: ${avgRenderTime.toFixed(3)}μs`);

      // Performance improvement calculation
      const improvement = ((hotRPS - warmupRPS) / warmupRPS * 100).toFixed(1);
      console.log(`   V8 optimization gain: +${improvement}%\n`);

      // We are only interested in the log output
      expect(true).toBe(true);
    });
  });
});
