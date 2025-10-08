import { ref } from 'vue';
import {
  createActor,
  setNaturalStatValue,
  refreshStats,
  Stat,
  Team,
  createWeaponSchema,
  type WeaponSchema,
  TransformerContext
} from '@flux/core';
import type { ActorSetupData } from '../types';
import { useActorEquipment } from './useActorEquipment';

// Removed unused ACTOR_NAMES constant

// Create properly typed weapon schemas using core utilities
const createLongswordSchema = (): WeaponSchema => createWeaponSchema({
  urn: 'flux:schema:weapon:longsword' as any,
  name: 'Longsword',
  baseMass: 1500, // 1.5kg
  skill: 'flux:skill:weapon:melee' as any,
  range: {
    optimal: 2,
  },
  attack: { base: 6 },
});

const createBowSchema = (): WeaponSchema => createWeaponSchema({
  urn: 'flux:schema:weapon:bow' as any,
  name: 'Longbow',
  baseMass: 800, // 0.8kg
  skill: 'flux:skill:weapon:ranged' as any,
  range: {
    optimal: 50,
    max: 150,
    falloff: 30,
    min: 10
  },
  attack: { base: 5 },
  ammo: {
    type: 'flux:schema:ammo:arrow' as any,
    capacity: 30
  }
});

const createDaggerSchema = (): WeaponSchema => createWeaponSchema({
  urn: 'flux:schema:weapon:dagger' as any,
  name: 'Dagger',
  baseMass: 300, // 0.3kg
  skill: 'flux:skill:weapon:melee' as any,
  range: {
    optimal: 1,
  },
  attack: { base: 4 },
});

// Create weapon instances
const mockWeapons: WeaponSchema[] = [
  createLongswordSchema(),
  createBowSchema(),
  createDaggerSchema()
];

export function useActorSetup(context: TransformerContext) {
  const availableWeapons = ref(mockWeapons);
  const equipment = useActorEquipment(context);

  const createDefaultActors = (): ActorSetupData[] => {
    // Create Alice (Team Alpha, not removable)
    const alice = createActor({
      name: 'Alice',
      description: { base: 'A skilled warrior' }
    });

    // Create Bob (Team Bravo, not removable)
    const bob = createActor({
      name: 'Bob',
      description: { base: 'A cunning fighter' }
    });

    // Add basic skills
    alice.skills = {
      'flux:skill:weapon:melee': { rank: 3, xp: 0, pxp: 0 },
      'flux:skill:evasion': { rank: 2, xp: 0, pxp: 0 }
    };

    bob.skills = {
      'flux:skill:weapon:ranged': { rank: 3, xp: 0, pxp: 0 },
      'flux:skill:evasion': { rank: 2, xp: 0, pxp: 0 }
    };

    // Create ActorSetupData objects first
    const aliceSetup: ActorSetupData = {
      ...alice,
      team: Team.ALPHA,
      isAI: false,
      weaponUrn: mockWeapons[0].urn, // Longsword
      canRemove: false
    };

    const bobSetup: ActorSetupData = {
      ...bob,
      team: Team.BRAVO,
      isAI: true,
      weaponUrn: mockWeapons[1].urn, // Bow
      canRemove: false
    };

    // Equip weapons properly
    equipment.equipWeapon(aliceSetup, mockWeapons[0]); // Longsword
    equipment.equipWeapon(bobSetup, mockWeapons[1]);   // Bow

    return [aliceSetup, bobSetup];
  };

  const updateActorStat = (actor: ActorSetupData, stat: Stat, value: number): void => {
    setNaturalStatValue(actor, stat, value);
    refreshStats(actor, [stat]);
  };

  const updateActorWeapon = (actor: ActorSetupData, weaponUrn: string): void => {
    equipment.updateActorWeapon(actor, weaponUrn, availableWeapons.value);
  };

  const updateActorSkill = (actor: ActorSetupData, skillUrn: string, rank: number): void => {
    const skillKey = skillUrn as keyof typeof actor.skills;
    if (!actor.skills[skillKey]) {
      (actor.skills as any)[skillKey] = { rank: 1, xp: 0, pxp: 0 };
    }
    (actor.skills[skillKey] as any).rank = rank;
  };

  const toggleActorAI = (actor: ActorSetupData, isAI: boolean): void => {
    actor.isAI = isAI;
  };

  const createAdditionalActor = (name: string, team: Team): ActorSetupData => {
    const actor = createActor({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      description: { base: `Additional ${team.toLowerCase()} team member` }
    });

    // Add basic skills
    actor.skills = {
      'flux:skill:weapon:melee': { rank: 2, xp: 0, pxp: 0 },
      'flux:skill:evasion': { rank: 1, xp: 0, pxp: 0 }
    };

    // Create ActorSetupData object first
    const actorSetup: ActorSetupData = {
      ...actor,
      team,
      isAI: true,
      weaponUrn: mockWeapons[2].urn, // Dagger
      canRemove: true
    };

    // Equip weapon properly
    equipment.equipWeapon(actorSetup, mockWeapons[2]); // Dagger

    return actorSetup;
  };

  return {
    availableWeapons,
    createDefaultActors,
    updateActorStat,
    updateActorWeapon,
    updateActorSkill,
    toggleActorAI,
    createAdditionalActor
  };
}
