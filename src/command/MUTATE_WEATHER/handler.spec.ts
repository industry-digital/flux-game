import { describe, it, expect, beforeEach } from 'vitest';
import { mutateWeatherReducer, MUTATE_WEATHER, MutateWeatherCommand } from './handler';
import { Weather } from '~/types/entity/place';
import {
    TransformerContext,
    CommandType,
    EventType,
    PlaceURN,
    Command
} from '@flux';
import {
    createCommand,
    createTransformerContext,
    createTestPlace,
    createHandlerTest
} from '~/testing';

describe('MUTATE_WEATHER Handler', () => {
  let mockContext: TransformerContext;
  let mockPlace: any;
  let mockWeather: Weather;
  let mockCommand: MutateWeatherCommand;

  beforeEach(() => {
    // Setup mock weather data
    mockWeather = {
      // Fundamental inputs
      temperature: 25,
      pressure: 1013,
      humidity: 65,
      // Derived outputs
      precipitation: 10,
      ppfd: 1800,
      clouds: 35,
      // Metadata
      ts: Date.now()
    };

    // Setup mock place using testing utilities
    mockPlace = createTestPlace({
      id: 'flux:place:test-location' as PlaceURN,
      weather: {
        // Fundamental inputs
        temperature: 20,
        pressure: 1010,
        humidity: 70,
        // Derived outputs
        precipitation: 5,
        ppfd: 1200,
        clouds: 50,
        // Metadata
        ts: Date.now() - 3600000 // 1 hour ago
      }
    });

    // Setup mock context using testing utilities
    mockContext = createTransformerContext({
      world: {
        actors: {},
        places: {
          'flux:place:test-location': mockPlace
        }
      }
    });

    // Setup mock command using testing utilities
    mockCommand = createCommand(CommandType.MUTATE_WEATHER, {
      id: 'test-command-id',
      args: {
        placeId: 'flux:place:test-location' as PlaceURN,
        weather: mockWeather
      }
    }) as MutateWeatherCommand;
  });

  describe('mutateWeatherReducer', () => {
    describe('Happy Path', () => {
      it('should update place weather with new weather data', () => {
        const result = mutateWeatherReducer(mockContext, mockCommand);

        expect(mockPlace.weather).toEqual(mockWeather);
        expect(result).toBe(mockContext);
      });

      it('should generate WEATHER_DID_CHANGE event with correct payload', () => {
        const previousWeather = { ...mockPlace.weather };

        mutateWeatherReducer(mockContext, mockCommand);

        expect(mockContext.declareEvent).toHaveBeenCalledWith({
          type: EventType.WEATHER_DID_CHANGE,
          trace: 'test-command-id',
          location: 'flux:place:test-location',
          payload: {
            from: previousWeather,
            to: mockWeather,
          }
        });
      });

      it('should handle place with no existing weather', () => {
        // Remove existing weather
        delete mockPlace.weather;

        mutateWeatherReducer(mockContext, mockCommand);

        expect(mockPlace.weather).toEqual(mockWeather);
        expect(mockContext.declareEvent).toHaveBeenCalledWith({
          type: EventType.WEATHER_DID_CHANGE,
          trace: 'test-command-id',
          location: 'flux:place:test-location',
          payload: {
            from: null,
            to: mockWeather,
          }
        });
      });
    });

    describe('Error Cases', () => {
      it('should declare error when place does not exist', () => {
        const nonExistentCommand = createCommand(CommandType.MUTATE_WEATHER, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:nonexistent' as PlaceURN,
            weather: mockWeather
          }
        }) as MutateWeatherCommand;

        const result = mutateWeatherReducer(mockContext, nonExistentCommand);

        expect(mockContext.declareError).toHaveBeenCalledWith('Place flux:place:nonexistent not found');
        expect(mockContext.declareEvent).not.toHaveBeenCalled();
        expect(result).toBe(mockContext);
      });

      it('should declare error when places object is empty', () => {
        const emptyWorldContext = createTransformerContext({
          world: {
            actors: {},
            places: {}
          }
        });

        const result = mutateWeatherReducer(emptyWorldContext, mockCommand);

        expect(emptyWorldContext.declareError).toHaveBeenCalledWith('Place flux:place:test-location not found');
        expect(emptyWorldContext.declareEvent).not.toHaveBeenCalled();
        expect(result).toBe(emptyWorldContext);
      });


    });

    describe('Edge Cases', () => {
      it('should handle extreme weather values', () => {
        const extremeWeather: Weather = {
          // Fundamental inputs
          temperature: -50,
          pressure: 800,
          humidity: 95,
          // Derived outputs
          precipitation: 1000,
          ppfd: 0,
          clouds: 100,
          // Metadata
          ts: 0
        };

        const extremeCommand = createCommand(CommandType.MUTATE_WEATHER, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:test-location' as PlaceURN,
            weather: extremeWeather
          }
        }) as MutateWeatherCommand;

        mutateWeatherReducer(mockContext, extremeCommand);

        expect(mockPlace.weather).toEqual(extremeWeather);
        expect(mockContext.declareEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: {
              from: expect.any(Object),
              to: extremeWeather
            }
          })
        );
      });

      it('should handle weather with decimal values', () => {
        const preciseWeather: Weather = {
          // Fundamental inputs
          temperature: 23.7,
          pressure: 1013.25,
          humidity: 67.5,
          // Derived outputs
          precipitation: 15.3,
          ppfd: 1650.8,
          clouds: 42.3,
          // Metadata
          ts: 1234567890.123
        };

        const preciseCommand = createCommand(CommandType.MUTATE_WEATHER, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:test-location' as PlaceURN,
            weather: preciseWeather
          }
        }) as MutateWeatherCommand;

        mutateWeatherReducer(mockContext, preciseCommand);

        expect(mockPlace.weather).toEqual(preciseWeather);
      });

      it('should handle same weather values (no change)', () => {
        const sameWeather = { ...mockPlace.weather };
        const sameCommand = createCommand(CommandType.MUTATE_WEATHER, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:test-location' as PlaceURN,
            weather: sameWeather
          }
        }) as MutateWeatherCommand;

        mutateWeatherReducer(mockContext, sameCommand);

        expect(mockPlace.weather).toEqual(sameWeather);
        expect(mockContext.declareEvent).toHaveBeenCalledWith(
          expect.objectContaining({
            payload: {
              from: sameWeather,
              to: sameWeather
            }
          })
        );
      });
    });

    describe('State Mutation Verification', () => {
      it('should not mutate the input command', () => {
        const originalCommand = JSON.parse(JSON.stringify(mockCommand));

        mutateWeatherReducer(mockContext, mockCommand);

        expect(mockCommand).toEqual(originalCommand);
      });

      it('should not mutate the input weather object', () => {
        const originalWeather = JSON.parse(JSON.stringify(mockWeather));

        mutateWeatherReducer(mockContext, mockCommand);

        expect(mockCommand.args.weather).toEqual(originalWeather);
      });

      it('should directly mutate the place object', () => {
        const placeReference = mockPlace;

        mutateWeatherReducer(mockContext, mockCommand);

        expect(placeReference.weather).toEqual(mockWeather);
        expect(placeReference).toBe(mockPlace); // Same reference
      });
    });
  });

  describe('MUTATE_WEATHER Class', () => {
    let handler: MUTATE_WEATHER;

    beforeEach(() => {
      handler = new MUTATE_WEATHER();
    });

    describe('handles method', () => {
      it('should return true for MUTATE_WEATHER command', () => {
        const handlerTest = createHandlerTest(handler, mockCommand);
        const result = handlerTest.testHandles();

        expect(result.shouldHandleValidCommand()).toBe(true);
      });

      it('should return false for different command types', () => {
        const otherCommand = createCommand(CommandType.MOVE, {
          id: 'test-id',
          args: {}
        }) as Command;

        const result = handler.handles(otherCommand);
        expect(result).toBe(false);
      });

      it('should return false for command with wrong type but correct structure', () => {
        const wrongTypeCommand = {
          ...mockCommand,
          type: 'WRONG_TYPE' as any
        };

        const result = handler.handles(wrongTypeCommand);
        expect(result).toBe(false);
      });

      it('should return false for malformed command', () => {
        const malformedCommand = {
          type: CommandType.MUTATE_WEATHER
          // Missing required fields
        } as any;

        const result = handler.handles(malformedCommand);
        expect(result).toBe(false);
      });
    });

    describe('reduce property', () => {
      it('should reference the mutateWeatherReducer function', () => {
        expect(handler.reduce).toBe(mutateWeatherReducer);
      });
    });

    describe('dependencies property', () => {
      it('should have empty dependencies array', () => {
        expect(handler.dependencies).toEqual([]);
      });
    });
  });

  describe('Type Safety', () => {
    it('should work with valid MutateWeatherCommand type', () => {
      const validCommand = createCommand(CommandType.MUTATE_WEATHER, {
        id: 'test-id',
        args: {
          placeId: 'flux:place:test' as PlaceURN,
          weather: mockWeather
        }
      }) as MutateWeatherCommand;

      expect(() => mutateWeatherReducer(mockContext, validCommand)).not.toThrow();
    });

    it('should handle PlaceURN type correctly', () => {
      const placeUrn: PlaceURN = 'flux:place:mystical-forest' as PlaceURN;
      const forestPlace = createTestPlace({ id: placeUrn });

      const contextWithForest = createTransformerContext({
        world: {
          actors: {},
          places: { [placeUrn]: forestPlace }
        }
      });

      const forestCommand = createCommand(CommandType.MUTATE_WEATHER, {
        id: 'test-command-id',
        args: {
          placeId: placeUrn,
          weather: mockWeather
        }
      }) as MutateWeatherCommand;

      mutateWeatherReducer(contextWithForest, forestCommand);

      expect(contextWithForest.declareEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          location: placeUrn
        })
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle rapid weather changes', () => {
            const weather1: Weather = {
        temperature: 10, pressure: 1020, humidity: 40,
        precipitation: 0, ppfd: 800, clouds: 20,
        ts: 1000
      };
      const weather2: Weather = {
        temperature: 30, pressure: 980, humidity: 85,
        precipitation: 50, ppfd: 500, clouds: 90,
        ts: 2000
      };

      const command1 = createCommand(CommandType.MUTATE_WEATHER, {
        id: 'test-command-1',
        args: {
          placeId: 'flux:place:test-location' as PlaceURN,
          weather: weather1
        }
      }) as MutateWeatherCommand;

      const command2 = createCommand(CommandType.MUTATE_WEATHER, {
        id: 'test-command-2',
        args: {
          placeId: 'flux:place:test-location' as PlaceURN,
          weather: weather2
        }
      }) as MutateWeatherCommand;

      mutateWeatherReducer(mockContext, command1);
      mutateWeatherReducer(mockContext, command2);

      expect(mockPlace.weather).toEqual(weather2);
      expect(mockContext.declareEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple places with different weather', () => {
      const place2 = createTestPlace({ id: 'flux:place:desert' as PlaceURN });
            const weather2: Weather = {
        temperature: 40, pressure: 1000, humidity: 15,
        precipitation: 0, ppfd: 2200, clouds: 5,
        ts: 3000
      };

      const multiPlaceContext = createTransformerContext({
        world: {
          actors: {},
          places: {
            'flux:place:test-location': mockPlace,
            'flux:place:desert': place2
          }
        }
      });

      // Update first place
      mutateWeatherReducer(multiPlaceContext, mockCommand);

      // Update second place
      const command2 = createCommand(CommandType.MUTATE_WEATHER, {
        id: 'test-command-2',
        args: {
          placeId: 'flux:place:desert' as PlaceURN,
          weather: weather2
        }
      }) as MutateWeatherCommand;

      mutateWeatherReducer(multiPlaceContext, command2);

      expect(multiPlaceContext.world.places['flux:place:test-location'].weather).toEqual(mockWeather);
      expect(multiPlaceContext.world.places['flux:place:desert'].weather).toEqual(weather2);
      expect(multiPlaceContext.declareEvent).toHaveBeenCalledTimes(2);
    });
  });
});
