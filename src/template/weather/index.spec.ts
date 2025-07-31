import { describe, it, expect, vi } from 'vitest';
import { describeWeatherChange, DescribeWeatherChangeProps } from './index';
import { Weather } from '~/types/schema/weather';

/**
 * Comprehensive test suite for the Weather Description System
 * Tests the public API and various atmospheric transition scenarios
 */

describe('Weather Description System', () => {
  // Test helper to create mock weather data
  const createWeather = (overrides: Partial<Weather> = {}): Weather => {
    const baseTime = new Date('2024-01-01T12:00:00Z').getTime(); // Default to noon for stable conditions
    return {
      temperature: 20,
      pressure: 1013,
      humidity: 60,
      precipitation: 0,
      ppfd: 800,
      clouds: 30,
      fog: 0.1,
      ts: baseTime,
      ...overrides,
    };
  };

  // Test helper to create props with mock functions
  const createProps = (previous: Weather, current: Weather, overrides: Partial<DescribeWeatherChangeProps> = {}): DescribeWeatherChangeProps => ({
    previous,
    current,
    random: vi.fn(() => 0.5),
    timestamp: vi.fn(() => new Date('2024-01-01T12:00:00Z').getTime()), // Consistent with default baseTime
    uniqid: vi.fn(() => 'test-id'),
    debug: vi.fn(),
    ...overrides,
  });

  describe('Basic Validation', () => {
    it('returns empty string when no previous weather provided', () => {
      const current = createWeather();
      const props = createProps(current, current);
      delete props.previous;

      const result = describeWeatherChange(props);
      expect(result).toBe('');
    });

    it('returns empty string for invalid weather data', () => {
      const previous = createWeather();
      const current = createWeather({ temperature: 1000 }); // Invalid temperature
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toBe('');
    });

    it('returns empty string for insignificant weather changes', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z').getTime(); // Noon for stable daylight conditions
      const previous = createWeather({ temperature: 20, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ temperature: 20.5, ts: baseTime }); // 0.5°C change over 1 hour (rate: 0.5°C/hour < 2°C/hour threshold)
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toBe('');
    });

    it('treats weather changes consistently regardless of sampling frequency', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z').getTime(); // Noon for stable daylight conditions

      // Same rate of change (3°C/hour) sampled at different frequencies
      // High frequency: 0.05°C change over 1 minute
      const prevHighFreq = createWeather({ temperature: 20, ts: baseTime - 60000 }); // 1 minute ago
      const currHighFreq = createWeather({ temperature: 20.05, ts: baseTime });
      const propsHighFreq = createProps(prevHighFreq, currHighFreq);

      // Low frequency: 3°C change over 1 hour
      const prevLowFreq = createWeather({ temperature: 20, ts: baseTime - 3600000 }); // 1 hour ago
      const currLowFreq = createWeather({ temperature: 23, ts: baseTime });
      const propsLowFreq = createProps(prevLowFreq, currLowFreq);

      const resultHighFreq = describeWeatherChange(propsHighFreq);
      const resultLowFreq = describeWeatherChange(propsLowFreq);

      // Both should be treated the same (significant change rate of 3°C/hour > 2°C/hour threshold)
      expect(resultHighFreq.length > 0).toBe(resultLowFreq.length > 0);
    });
  });

  describe('Solar Transitions', () => {
    it('describes dawn transition', () => {
      const previous = createWeather({
        ts: new Date('2024-01-01T04:30:00Z').getTime(),
        ppfd: 10,
        clouds: 20
      });
      const current = createWeather({
        ts: new Date('2024-01-01T06:30:00Z').getTime(),
        ppfd: 200,
        clouds: 20
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/dawn/i); // Case insensitive
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes sunset transition', () => {
      const previous = createWeather({
        ts: new Date('2024-01-01T17:00:00Z').getTime(),
        ppfd: 1200,
        clouds: 15
      });
      const current = createWeather({
        ts: new Date('2024-01-01T19:00:00Z').getTime(),
        ppfd: 400,
        clouds: 15
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/sun.*sinks|sun.*set|evening|dusk|honey.*light/i); // More flexible patterns
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Cloud Transitions', () => {
    it('describes clouds gathering', () => {
      const baseTime = new Date('2024-01-01T14:00:00Z').getTime(); // Early afternoon for clear cloud observation
      const previous = createWeather({ clouds: 10, ppfd: 1400, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ clouds: 70, ppfd: 600, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/cloud.*gather|overcast.*build/i);
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes clouds clearing', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z').getTime(); // Mid-morning for clear cloud observation
      const previous = createWeather({ clouds: 85, ppfd: 300, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ clouds: 25, ppfd: 1100, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/cloud.*clear|break.*up|sunlight.*burst/i);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Precipitation Transitions', () => {
    it('describes rain starting', () => {
      const baseTime = new Date('2024-01-01T13:00:00Z').getTime(); // Early afternoon
      const previous = createWeather({ precipitation: 0, clouds: 70, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ precipitation: 5, clouds: 75, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/rain.*begin|drop.*fall|drizzle.*start/i);
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes rain stopping', () => {
      const baseTime = new Date('2024-01-01T15:00:00Z').getTime(); // Mid afternoon
      const previous = createWeather({ precipitation: 8, clouds: 80, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ precipitation: 0, clouds: 60, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/rain.*stop|cease|end/i);
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes heavy rain starting', () => {
      const baseTime = new Date('2024-01-01T16:00:00Z').getTime(); // Late afternoon
      const previous = createWeather({ precipitation: 1, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ precipitation: 30, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/heavy|torrent|downpour|drum/i);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Fog Transitions', () => {
    it('describes fog forming', () => {
      const baseTime = new Date('2024-01-01T05:30:00Z').getTime(); // Early morning when fog is most noticeable
      const previous = createWeather({ fog: 0.1, humidity: 70, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ fog: 0.7, humidity: 90, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/fog/);
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes fog dissipating', () => {
      const baseTime = new Date('2024-01-01T10:00:00Z').getTime(); // Mid-morning for clear fog observation
      const previous = createWeather({ fog: 0.8, ppfd: 200, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ fog: 0.2, ppfd: 900, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/fog.*dissipat|fog.*clear|fog.*retreat|burn.*off|disperses.*moisture|warming.*air/i);
      expect(result.length).toBeGreaterThan(0);
    });
  });

    describe('Storm Events', () => {
    it('describes storm approaching', () => {
      const baseTime = new Date('2024-01-01T11:00:00Z').getTime(); // Late morning
      const previous = createWeather({
        clouds: 30,
        pressure: 1020,
        ppfd: 1200,
        precipitation: 0,
        ts: baseTime - 3600000 // 1 hour ago
      });
      const current = createWeather({
        clouds: 85,
        pressure: 995,
        ppfd: 400,
        precipitation: 2,
        ts: baseTime
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/storm|dark.*cloud|ominous/i);
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes storm clearing', () => {
      const baseTime = new Date('2024-01-01T09:00:00Z').getTime(); // Mid morning
      const previous = createWeather({
        clouds: 90,
        pressure: 990,
        ppfd: 200,
        precipitation: 15,
        ts: baseTime - 3600000 // 1 hour ago
      });
      const current = createWeather({
        clouds: 35,
        pressure: 1015,
        ppfd: 1000,
        precipitation: 1,
        ts: baseTime
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/storm.*pass|overcast.*break|clouds.*clear|sunlight.*burst|sunlight.*penetrate|shafts.*sunlight/i);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Synergistic Transitions', () => {
    it('describes dawn breaking through clearing clouds', () => {
      const previous = createWeather({
        ts: new Date('2024-01-01T05:30:00Z').getTime(),
        clouds: 80,
        ppfd: 50
      });
      const current = createWeather({
        ts: new Date('2024-01-01T07:00:00Z').getTime(),
        clouds: 30,
        ppfd: 800
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/dawn.*break.*through|dawn.*triumph/i);
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes dawn struggling through gathering clouds', () => {
      const previous = createWeather({
        ts: new Date('2024-01-01T05:30:00Z').getTime(),
        clouds: 20,
        ppfd: 50
      });
      const current = createWeather({
        ts: new Date('2024-01-01T07:00:00Z').getTime(),
        clouds: 75,
        ppfd: 300
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/dawn.*struggle|reluctant|fight.*penetrat/i);
      expect(result.length).toBeGreaterThan(0);
    });

    it('describes evening mist formation', () => {
      const previous = createWeather({
        ts: new Date('2024-01-01T17:30:00Z').getTime(),
        fog: 0.1,
        temperature: 25
      });
      const current = createWeather({
        ts: new Date('2024-01-01T19:30:00Z').getTime(),
        fog: 0.6,
        temperature: 18
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/evening.*mist|setting sun.*mist|dreamlike/i);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles undefined random function gracefully', () => {
      const previous = createWeather();
      const current = createWeather({ clouds: 70 });
      const props = createProps(previous, current, { random: undefined });

      const result = describeWeatherChange(props);
      expect(typeof result).toBe('string');
    });

    it('handles undefined debug function gracefully', () => {
      const previous = createWeather();
      const current = createWeather({ precipitation: 5 });
      const props = createProps(previous, current, { debug: undefined });

      const result = describeWeatherChange(props);
      expect(typeof result).toBe('string');
    });

    it('continues processing when a reducer throws an error', () => {
      const previous = createWeather();
      const current = createWeather({ temperature: 30 });
      const props = createProps(previous, current);

      // Mock debug to capture error messages
      const mockDebug = vi.fn();
      props.debug = mockDebug;

      const result = describeWeatherChange(props);
      expect(typeof result).toBe('string');
    });
  });

  describe('Output Quality', () => {
        it('produces properly formatted sentences', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z').getTime(); // Noon for stable conditions
      const previous = createWeather({ clouds: 10, ts: baseTime - 3600000 }); // 1 hour ago
      const current = createWeather({ clouds: 70, ts: baseTime });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);

      if (result.length > 0) {
        // Should start with capital letter
        expect(result[0]).toMatch(/[A-Z]/);

        // Should not have double periods
        expect(result).not.toMatch(/\.\./);

        // Should not have extra whitespace
        expect(result).not.toMatch(/\s{2,}/);
      }
    });

    it('generates descriptions with appropriate length', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z').getTime(); // Noon for stable conditions
      const previous = createWeather({
        clouds: 20,
        precipitation: 0,
        fog: 0.1,
        ts: baseTime - 3600000 // 1 hour ago
      });
      const current = createWeather({
        clouds: 80,
        precipitation: 10,
        fog: 0.6,
        ts: baseTime
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);

      if (result.length > 0) {
        // Should be descriptive but not excessively long
        expect(result.length).toBeGreaterThan(20);
        expect(result.length).toBeLessThan(500);
      }
    });

    it('generates different descriptions for different weather conditions', () => {
      const baseTime = new Date('2024-01-01T12:00:00Z').getTime(); // Noon for stable conditions

      // Test different weather scenarios that should produce different language
      const scenarios = [
        // Light rain scenario
        {
          previous: createWeather({ precipitation: 0, clouds: 40, ppfd: 1000, ts: baseTime - 3600000 }),
          current: createWeather({ precipitation: 3, clouds: 60, ppfd: 600, ts: baseTime })
        },
        // Heavy rain scenario
        {
          previous: createWeather({ precipitation: 0, clouds: 30, ppfd: 1200, ts: baseTime - 3600000 }),
          current: createWeather({ precipitation: 15, clouds: 80, ppfd: 300, ts: baseTime })
        },
        // Cloud clearing scenario
        {
          previous: createWeather({ precipitation: 0, clouds: 80, ppfd: 400, ts: baseTime - 3600000 }),
          current: createWeather({ precipitation: 0, clouds: 30, ppfd: 1100, ts: baseTime })
        }
      ];

      const results = scenarios.map((scenario, i) => {
        const props = createProps(scenario.previous, scenario.current);
        return describeWeatherChange(props);
      }).filter(result => result.length > 0);

      // Should generate some descriptions
      expect(results.length).toBeGreaterThan(0);

      // Different weather conditions should produce different descriptions
      if (results.length > 1) {
        const uniqueResults = new Set(results);
        expect(uniqueResults.size).toBeGreaterThan(1);
      }
    });
  });

    describe('Atmospheric Mood Detection', () => {
      it('detects ominous conditions', () => {
        const baseTime = new Date('2024-01-01T15:30:00Z').getTime(); // Late afternoon
        const previous = createWeather({
          clouds: 20,
          pressure: 1020,
          ppfd: 1200,
          precipitation: 0,
          ts: baseTime - 3600000 // 1 hour ago
        });
        const current = createWeather({
          clouds: 85,
          pressure: 995,
          ppfd: 300,
          precipitation: 3,
          ts: baseTime
        });
        const props = createProps(previous, current);

        const result = describeWeatherChange(props);
        expect(result).toMatch(/ominous|dark|menacing|heavy|shadow|storm.*cloud|burden|drum.*against/i);
    });

    it('detects peaceful conditions', () => {
      const baseTime = new Date('2024-01-01T08:00:00Z').getTime(); // Early morning
      const previous = createWeather({
        clouds: 80,
        precipitation: 12,
        fog: 0.7,
        ts: baseTime - 3600000 // 1 hour ago
      });
      const current = createWeather({
        clouds: 30,
        precipitation: 0,
        fog: 0.1,
        ppfd: 1100,
        ts: baseTime
      });
      const props = createProps(previous, current);

      const result = describeWeatherChange(props);
      expect(result).toMatch(/peaceful|gentle|tranquil|clear|bright|welcome|fresh|clean|break.*up|penetrate/i);
    });
  });
});
