import { ActorURN } from '~/types/taxonomy';
import { WorkbenchSession, ShellMutation } from '~/types/workbench';
import { Shell } from '~/types/entity/shell';
import { WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';

export type WorkbenchOperations = {
  addMutation: (mutation: ShellMutation) => void;
  removeMutation: (index: number) => void;
  clearMutations: () => void;
  calculateTotalCost: () => number;
  previewShell: () => Shell;
  commitChanges: (trace: string) => WorldEvent[];
};

/**
 * Creates workbench operations for manipulating shell mutations
 */
export function createWorkbenchOperations(
  context: TransformerContext,
  session: WorkbenchSession,
  actorId: ActorURN,
): WorkbenchOperations {
  const { world } = context;

  function addMutation(mutation: ShellMutation): void {
    session.data.pendingChanges.push(mutation);
  }

  function removeMutation(index: number): void {
    if (index >= 0 && index < session.data.pendingChanges.length) {
      session.data.pendingChanges.splice(index, 1);
    }
  }

  function clearMutations(): void {
    session.data.pendingChanges = [];
  }

  function calculateTotalCost(): number {
    // TODO: Implement cost calculation based on pending mutations
    // This should iterate through pendingChanges and calculate total scrap cost
    return 0;
  }

  function previewShell(): Shell {
    // TODO: Apply pending mutations to current shell and return preview
    // This should create a copy of the current shell and apply all mutations
    const actor = world.actors[actorId];
    if (!actor) {
      throw new Error(`Actor ${actorId} not found`);
    }

    const currentShell = actor.shells[session.data.currentShellId];
    if (!currentShell) {
      throw new Error(`Shell ${session.data.currentShellId} not found`);
    }

    // For now, return the current shell without mutations applied
    return currentShell;
  }

  function commitChanges(trace: string): WorldEvent[] {
    const events: WorldEvent[] = [];

    // TODO: Implement mutation application logic
    // 1. Calculate total cost
    // 2. Validate actor has sufficient resources
    // 3. Apply mutations to shell
    // 4. Deduct resources from actor
    // 5. Generate appropriate events
    // 6. Clear pending changes

    // For now, just clear the mutations
    clearMutations();

    return events;
  }

  return {
    addMutation,
    removeMutation,
    clearMutations,
    calculateTotalCost,
    previewShell,
    commitChanges,
  };
}
