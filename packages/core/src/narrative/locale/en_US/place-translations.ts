import { TransformerContext } from '~/types/handler';
import { PlaceURN } from '~/types/taxonomy';

const BARE_PLACE_URNS: Record<string, string> = {
  'origin': 'Home Base',
  'nowhere': 'Nowhere',
};

const PLACE_TRANSLATIONS: Record<string, string> = Object.fromEntries(
  Object.entries(BARE_PLACE_URNS).map(([urn, name]) => [`flux:place:${urn}`, name]),
);

const MISSING_PLACE_TRANSLATION: string = 'Unknown Place';

export const getPlaceTranslation = (context: TransformerContext, urn: PlaceURN): string => {
  return PLACE_TRANSLATIONS[urn] || MISSING_PLACE_TRANSLATION;
};
