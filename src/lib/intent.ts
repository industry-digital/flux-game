import { randomUUID } from '~/lib/uuid';
import { AbstractCommand, CommandType, Intent, NaturalLanguageAnalysis } from '~/types/intent';
import { EntityURN } from '~/types/taxonomy';

const identity = <I, O = I>(x: I): O => x as unknown as O;

export type FactoryOptions = {
  now?: number;
  uuid?: () => string;
};

type Transformer<I, O = I> = (input: I) => O;

type IntentTransformer = Transformer<Intent>;

export const createIntentFromText = (
  nlp: (text: string) => any,
  self: EntityURN,
  text: string,
  transform: IntentTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): Intent => {
  const nlpAnalysis = createNaturalLanguageAnalysis(nlp, text);

  const defaults: Partial<Intent> = {
    __type: 'intent',
    id: uuid(),
    ts: now,
    actor: self,
    text,
    nlp: nlpAnalysis,
  };

  return transform(defaults as Intent) as Intent;
};

type CommandTransformer = Transformer<AbstractCommand>;

export const createCommand = <T extends CommandType>(
  transform: CommandTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): AbstractCommand <T> => {
  const defaults: Partial<AbstractCommand<T>> = {
    __type: 'command',
    id: uuid(),
    ts: now,
    args: {},
  };
  return transform(defaults as AbstractCommand<T>)  as AbstractCommand<T>;
};

export const createCommandFromIntent = <T extends CommandType>(
  intent: Intent,
  transform: CommandTransformer = identity,
  { now = Date.now(), uuid = randomUUID }: FactoryOptions = {},
): AbstractCommand<T> => {
  const defaults: Partial<AbstractCommand<T>> = {
    __type: 'command',
    id: intent.id,
    ts: now,
    actor: intent.actor,
  };

  return transform(defaults as AbstractCommand<T>) as AbstractCommand<T>;
};

export const createNaturalLanguageAnalysis = (
  nlp: (text: string) => any,
  text: string
): NaturalLanguageAnalysis => {
  const doc = nlp(text);

  return {
    verbs: doc.verbs().out('array'),
    nouns: doc.nouns().out('array'),
    adjectives: doc.adjectives().out('array'),
  };
};
