import { describe, it, expect } from 'vitest';
import { renderPlaceSummary, renderExits, renderExitDirection, PlaceTemplateProps } from './place';
import { Place } from '~/types/entity/place';
import { Direction } from '~/types/world/space';
import { createPlace } from '~/worldkit/entity/place';

describe('place templates', () => {
  describe('renderExitDirection', () => {
    it('should capitalize direction and format basic destination', () => {
      const result = renderExitDirection({
        direction: 'north',
        exit: { label: 'forest path' }
      });

      expect(result).toBe('North to forest path');
    });

    it('should extract destination from action descriptions', () => {
      const result = renderExitDirection({
        direction: 'east',
        exit: { label: 'Drive downtown to Corpo Plaza' }
      });

      expect(result).toBe('East to Corpo Plaza');
    });

    it('should handle multiple "to" words in label', () => {
      const result = renderExitDirection({
        direction: 'south',
        exit: { label: 'Take the NCART to Watson Market' }
      });

      expect(result).toBe('South to Watson Market');
    });

    it('should handle labels without "to" pattern', () => {
      const result = renderExitDirection({
        direction: 'west',
        exit: { label: 'wooden door' }
      });

      expect(result).toBe('West to wooden door');
    });

    it('should handle compound directions', () => {
      const result = renderExitDirection({
        direction: 'northeast',
        exit: { label: 'mountain trail' }
      });

      expect(result).toBe('Northeast to mountain trail');
    });
  });

  describe('renderExits', () => {
    it('should render no exits message when exits object is empty', () => {
      const place = createPlace({
        id: 'flux:place:test:empty',
        name: 'Empty Room',
        description: 'A room with no exits',
        exits: [],
      });

      const result = renderExits({ place });

      expect(result).toBe('Exits: None');
    });

    it('should render single exit', () => {
      const place = createPlace({
        id: 'flux:place:test:single',
        name: 'Single Exit Room',
        description: 'A room with one exit',
        exits: [
          {
            direction: Direction.NORTH,
            label: 'wooden door',
            to: 'flux:place:test:hallway',
          },
        ],
      });

      const result = renderExits({ place });

      expect(result).toBe('Exits: North to wooden door');
    });

    it('should render multiple exits with comma separation', () => {
      const place = createPlace({
        id: 'flux:place:test:multiple',
        name: 'Crossroads',
        description: 'A junction with multiple paths',
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

      const result = renderExits({ place });

      expect(result).toBe('Exits: North to forest path, South to village road, East to mountain trail');
    });

    it('should handle action-style exit labels', () => {
      const place = createPlace({
        id: 'flux:place:test:actions',
        name: 'The Afterlife',
        description: 'A cyberpunk bar',
        exits: [
          {
            direction: Direction.EAST,
            label: 'Drive downtown to Corpo Plaza',
            to: 'flux:place:nightcity:corpo-plaza',
          },
          {
            direction: Direction.NORTH,
            label: 'Take the NCART to Watson Market',
            to: 'flux:place:nightcity:watson-market',
          },
        ],
      });

      const result = renderExits({ place });

      expect(result).toBe('Exits: East to Corpo Plaza, North to Watson Market');
    });
  });

  describe('renderPlaceSummary', () => {
    it('should render place with string description and no exits', () => {
      const place = createPlace({
        id: 'flux:place:test:basic',
        name: 'Empty Room',
        description: 'A simple empty room.',
        exits: [],
      });

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Empty Room\nA simple empty room.\n\nExits: None');
    });

    it('should render place with emergent narrative description', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:emergent',
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

      expect(result).toBe('Mysterious Chamber\nAn ancient stone chamber.\nStrange runes glow faintly on the walls.\nExits: None');
    });

    it('should render place with single exit', () => {
      const place = createPlace({
        id: 'flux:place:test:single-exit',
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

      expect(result).toBe('Room with Door\nA room with a single exit.\n\nExits: North to wooden door');
    });

    it('should render complete place with multiple exits', () => {
      const place = createPlace({
        id: 'flux:place:test:complete',
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

Exits: North to forest path, South to village road, East to mountain trail`;

      expect(result).toBe(expected);
    });

    it('should handle complex place with emergent narrative and exits', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:complex',
          name: 'Ancient Crossroads',
          description: 'Four ancient stone paths meet here.',
          exits: [
            {
              direction: Direction.NORTH,
              label: 'Take the bridge to the Northern Ruins',
              to: 'flux:place:ruins:bridge',
            },
            {
              direction: Direction.WEST,
              label: 'Follow the path to the Deep Forest',
              to: 'flux:place:forest:deep',
            },
          ],
        }),
        description: {
          base: 'Four ancient stone paths meet here.',
          emergent: 'Moss-covered signposts point in each direction.',
        },
      };

      const result = renderPlaceSummary({ place });

      const expected = `Ancient Crossroads
Four ancient stone paths meet here.
Moss-covered signposts point in each direction.
Exits: North to the Northern Ruins, West to the Deep Forest`;

      expect(result).toBe(expected);
    });

    it('should handle cyberpunk-style place with action exits', () => {
      const place = createPlace({
        id: 'flux:place:test:cyberpunk',
        name: 'The Afterlife',
        description: 'The legendary mercenary bar housed in a repurposed morgue.',
        exits: [
          {
            direction: Direction.EAST,
            label: 'Drive downtown to Corpo Plaza',
            to: 'flux:place:nightcity:corpo-plaza',
          },
          {
            direction: Direction.NORTH,
            label: 'Take the NCART to Watson Market',
            to: 'flux:place:nightcity:watson-market',
          },
          {
            direction: Direction.SOUTH,
            label: 'Head south to the Combat Zone',
            to: 'flux:place:nightcity:pacifica-combat-zone',
          },
        ],
      });

      const result = renderPlaceSummary({ place });

      const expected = `The Afterlife
The legendary mercenary bar housed in a repurposed morgue.

Exits: East to Corpo Plaza, North to Watson Market, South to the Combat Zone`;

      expect(result).toBe(expected);
    });
  });

  describe('type compatibility', () => {
    it('should maintain correct type for PlaceTemplateProps', () => {
      const place = createPlace({
        id: 'flux:place:test:types',
        name: 'Type Test Location',
        description: 'A test location for type checking',
        exits: [],
      });

      const input: PlaceTemplateProps = { place };
      const result = renderPlaceSummary(input);

      expect(typeof result).toBe('string');
      expect(result).toContain('Type Test Location');
    });
  });
});
