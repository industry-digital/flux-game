import { ModifiableBoundedAttribute, ModifiableScalarAttribute } from "~/types/entity/attribute";

const identity = <T>(x: T): T => x;

export const createModifiableScalarAttribute = (
  transform: (attribute: ModifiableScalarAttribute) => ModifiableScalarAttribute = identity,
): ModifiableScalarAttribute => {
  return transform({ nat: 10 });
};

export const createModifiableBoundedAttribute = (
  transform: (attribute: ModifiableBoundedAttribute) => ModifiableBoundedAttribute = identity,
): ModifiableBoundedAttribute => {
  return transform({ nat: { cur: 10, max: 10 } });
};
