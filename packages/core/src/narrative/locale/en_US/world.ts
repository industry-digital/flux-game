import { NOT_NEEDED } from '~/narrative/stub';
import {
  PlaceWasCreated,
  WeatherDidChange,
  ResourcesDidChange,
} from '~/types/event';
import { TemplateFunction } from '~/types/narrative';

export const renderPlaceCreatedNarrative: TemplateFunction<PlaceWasCreated> = NOT_NEEDED;
export const renderWeatherChangeNarrative: TemplateFunction<WeatherDidChange> = NOT_NEEDED;
export const renderResourcesChangeNarrative: TemplateFunction<ResourcesDidChange> = NOT_NEEDED;
