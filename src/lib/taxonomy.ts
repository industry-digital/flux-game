import { ROOT_NAMESPACE, Vocabulary, URNLike } from '~/types/domain';

const ALLOWED_VOCABULARIES = Object.values(Vocabulary);

const isVocabularyAllowed = (vocabulary: string): boolean => ALLOWED_VOCABULARIES.includes(vocabulary as Vocabulary);

export const createTaxonomyUrn = (vocabulary: string, ...tokens: string[]): URNLike => {
  if (!isVocabularyAllowed(vocabulary)) {
    throw new Error(`Invalid vocabulary: ${vocabulary}`);
  }

  const root: URNLike = `${ROOT_NAMESPACE}:${vocabulary}`;

  if (!tokens.length) {
    return root;
  }
  if (tokens.some(token => !token || typeof token !== 'string')) {
    throw new Error(`Invalid token: ${tokens}`);
  }

  return `${root}:${tokens.join(':')}`;
};
