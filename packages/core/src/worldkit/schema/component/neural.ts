import { ComponentSchema } from '~/types/schema/component';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';

export const NEURAL_INTERFACE_COMPONENT_BASE_URN = 'flux:schema:component:neural';

type Transform<T> = (input: T) => T;

const createNeuralInterfaceComponentSchema = (transform: Transform<ComponentSchema>): ComponentSchema => {
  const defaults: ComponentSchema = {
    urn: `${NEURAL_INTERFACE_COMPONENT_BASE_URN}:default`,
    powerDraw: 100,
    baseMass: 100,
    abilities: [],
    staticModifiers: [],
    fit: {
      [HumanAnatomy.HEAD]: 1,
    },
  };

  return transform(defaults);
};
