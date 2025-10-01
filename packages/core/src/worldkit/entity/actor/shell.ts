import { Shell } from '~/types/entity/shell';
import { Actor } from '~/types/entity/actor';
import { createShell } from '~/worldkit/entity/shell';

export const addShellToActor = (actor: Actor, shell: Shell = createShell()) => {
  actor.shells[shell.id] = shell;
};

export const removeShellFromActor = (actor: Actor, shellId: string) => {
  delete actor.shells[shellId];
};

export const getShellFromActor = (actor: Actor, shellId: string) => {
  return actor.shells[shellId];
};

export const getShellsFromActor = (actor: Actor) => {
  return actor.shells;
};
