import {
  WorkbenchSessionDidStart,
  WorkbenchSessionDidEnd,
  ActorDidStageShellMutation,
  ActorDidDiffShellMutations,
  ActorDidUndoShellMutations,
  ActorDidCommitShellMutations,
} from '~/types/event';
import { ShellMutationType } from '~/types/workbench';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';

export const renderWorkbenchSessionStartNarrative: TemplateFunction<WorkbenchSessionDidStart, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return 'You begin working at the shell workbench.';
  }

  return `${actor.name} begins working at a shell workbench.`;
};

export const renderWorkbenchSessionEndNarrative: TemplateFunction<WorkbenchSessionDidEnd, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return 'You finish your work at the shell workbench.';
  }

  return `${actor.name} finishes working at the shell workbench.`;
};

export const renderStageMutationNarrative: TemplateFunction<ActorDidStageShellMutation, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { mutation } = event.payload;

  if (recipientId === event.actor) {
    switch (mutation.type) {
      case ShellMutationType.STAT:
        return `You stage a stat modification to the shell design.`;
      case ShellMutationType.COMPONENT:
        return `You stage a component change to the shell design.`;
      default:
        return `You stage a change to the shell design.`;
    }
  }

  return `${actor.name} makes adjustments to their shell design.`;
};

export const renderDiffMutationsNarrative: TemplateFunction<ActorDidDiffShellMutations, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return 'You review the changes to your shell design.';
  }

  return `${actor.name} reviews their shell modifications.`;
};

export const renderUndoMutationsNarrative: TemplateFunction<ActorDidUndoShellMutations, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (recipientId === event.actor) {
    return 'You undo your recent shell modifications.';
  }

  return `${actor.name} undoes some shell modifications.`;
};

export const renderCommitMutationsNarrative: TemplateFunction<ActorDidCommitShellMutations, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { cost, mutations } = event.payload;

  if (recipientId === event.actor) {
    const mutationCount = mutations.length;
    const costText = cost > 0 ? ` for ${cost} credits` : '';
    return `You commit ${mutationCount} shell modification${mutationCount !== 1 ? 's' : ''}${costText}.`;
  }

  return `${actor.name} commits their shell modifications.`;
};

// Note: ActorDidExamineShell is handled in actor.ts as it's an actor examination event
