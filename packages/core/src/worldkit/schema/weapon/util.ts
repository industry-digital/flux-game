import { WeaponSchema } from '~/types/schema/weapon';
import { HumanAnatomy } from '~/types/taxonomy/anatomy';

export const isTwoHandedWeapon = (schema: WeaponSchema): boolean => {
  console.log(schema);
  // A weapon is two-handed if it occupies both hands
  const fit = schema.fit;
  if (!fit) {
    return false;
  }

  const occupiesLeftHand = fit[HumanAnatomy.LEFT_HAND];
  const occupiesRightHand = fit[HumanAnatomy.RIGHT_HAND];

  return !!(occupiesLeftHand && occupiesRightHand);
};
