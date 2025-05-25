import { createCharacterUrn } from '~/lib/taxonomy';
import { randomUUID } from '~/lib/uuid';
import { Command, CommandType, Intent } from '~/types/intent';

const identity = <I, O = I>(x: I): O => x as unknown as O;

export type FactoryOptions = {
  now?: number;
  uuid?: () => string;
};

type Transformer<I, O = I> = (input: I) => O;

type IntentTransformer = Transformer<Intent>;

export const createIntent = (
  transform: IntentTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): Intent  => {
  const defaults: Partial<Intent> = {
    __type: 'intent',
    id:  uuid(),
    ts: now,
    self: createCharacterUrn('nobody'),
  };

  return transform(defaults as Intent) as Intent;
};

type CommandTransformer = Transformer<Command>;

export const createCommand = <T extends CommandType>(
  transform: CommandTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): Command <T> => {
  const defaults: Partial<Command<T>> = {
    __type: 'command',
    id: uuid(),
    ts: now,
    args: {},
  };
  return transform(defaults as Command<T>)  as Command<T>;
};

export const createCommandFromIntent = <T extends CommandType>(
  intent: Intent,
  transform: CommandTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): Command<T> => {
  const defaults: Partial<Command<T>> = {
    __type: 'command',
    id: intent.id,
    ts: now,
    self: intent.self,
  };

  return transform(defaults as Command<T>) as Command<T>;
};
