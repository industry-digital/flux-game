import { CombatantDidAttack, EventType } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { LanguageTemplates, NarrativeItem } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';

const renderAttackNarrative = (context: TransformerContext, event: CombatantDidAttack, as: ActorURN): NarrativeItem => {
  const { world, equipmentApi } = context;
  const actor = world.actors[as];
  const target = world.actors[event.payload.target];
  const weapon = equipmentApi.getEquippedWeaponSchemaOrFail(actor);

  return {
    self: `You strike ${target.name} with your ${weapon.name} for ${event.payload.damage} damage.`,
    observer: `${actor.name} strikes ${target.name} with their ${weapon.name}.`
  };
};

export const en_US: LanguageTemplates = {
  [EventType.COMBATANT_DID_ATTACK]: renderAttackNarrative,
} as unknown as LanguageTemplates;
