import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MoveCommandReducer, ExpectedWorldState } from './reducer';
import { Command, CommandType, Entity, EntityType, PureReducerContext, createPlace } from '~/types/domain';
import { useActorMovement } from '~/lib/movement/actor';
import { createCharacter } from '~/lib/entity/util';

// Mock useActorMovement and its return
vi.mock('~/lib/movement/actor', () => ({
  useActorMovement: vi.fn(),
}));

describe('MoveCommandReducer', () => {
  type TestWorldState = ExpectedWorldState & {
    [key: string]: any;
  };

  let actor: Entity<EntityType.CHARACTER>;
  let context: PureReducerContext<ExpectedWorldState>;
  let world: ExpectedWorldState;
  let command: Command<CommandType.MOVE>;

  beforeEach(() => {
    actor = createCharacter(c => c);

    world = {
      actor,
      origin: createPlace(p => p),
      originEntities: { [actor.id]: actor },
      destination: createPlace(p => p),
      destinationEntities: {},
    } as TestWorldState;

    // Mock event declaration function
    context = {
      world,
      declareEvent: vi.fn(),
    } as unknown as PureReducerContext<ExpectedWorldState>;

    command = {
      type: CommandType.MOVE,
      args: {},
      id: 'cmd-1',
      ts: Date.now(),
    } as Command<CommandType.MOVE>;
  });

  it('calls moveTo and returns the context (success)', () => {
    // Set up the mock to return successful move
    const moveTo = vi.fn().mockReturnValue(true);
    (useActorMovement as ReturnType<typeof vi.fn>).mockReturnValue({ moveTo });

    const result = MoveCommandReducer(context, command);

    expect(useActorMovement).toHaveBeenCalledWith({
      actor: world.actor,
      origin: world.origin,
      originEntities: world.originEntities,
      context,
    });
    expect(moveTo).toHaveBeenCalledWith(world.destination, world.destinationEntities);
    expect(result).toBe(context);
  });

  it('calls moveTo and returns the context (fail)', () => {
    // Set up the mock to return failed move
    const moveTo = vi.fn().mockReturnValue(false);
    (useActorMovement as ReturnType<typeof vi.fn>).mockReturnValue({ moveTo });

    const result = MoveCommandReducer(context, command);

    expect(useActorMovement).toHaveBeenCalled();
    expect(moveTo).toHaveBeenCalledWith(world.destination, world.destinationEntities);
    expect(result).toBe(context);
  });

  it('properly passes world state and context to the movement hook', () => {
    const moveTo = vi.fn();
    (useActorMovement as ReturnType<typeof vi.fn>).mockReturnValue({ moveTo });

    MoveCommandReducer(context, command);

    // Confirm that all state slices are wired to the hook
    expect(useActorMovement).toHaveBeenCalledWith({
      actor: world.actor,
      origin: world.origin,
      originEntities: world.originEntities,
      context,
    });
  });

  it('calls moveTo with correct arguments', () => {
    const moveTo = vi.fn();
    (useActorMovement as ReturnType<typeof vi.fn>).mockReturnValue({ moveTo });

    MoveCommandReducer(context, command);

    expect(moveTo).toHaveBeenCalledWith(world.destination, world.destinationEntities);
  });

  it('does not throw if moveTo is missing (defensive)', () => {
    // Defensive: what if moveTo is undefined due to mocking error?
    (useActorMovement as ReturnType<typeof vi.fn>).mockReturnValue({});
    expect(() => MoveCommandReducer(context, command)).not.toThrow();
  });
});
