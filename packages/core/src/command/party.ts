import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { Party } from '~/types/entity/group';
import { ErrorCode } from '~/types/error';
import { ActorURN } from '~/types/taxonomy';

/**
 * Higher-order function that validates party-related commands and resolves the party
 * from the party owner ID in the command args.
 *
 * Used for commands where the actor operates on someone else's party (external party).
 *
 * This HOF performs the following validations:
 * 1. Ensures the party owner actor exists
 * 2. Ensures the party owner has a party
 * 3. Resolves and validates the party exists in the world
 *
 * If all validations pass, the resolved party is passed as the third argument
 * to the wrapped reducer function.
 *
 * @param reducer - The reducer function that will receive (context, command, party)
 * @returns A wrapped reducer that performs party validation before execution
 *
 * @example
 * ```typescript
 * const partyInviteRejectReducer = withBasicPartyValidation(
 *   (context, command, party) => {
 *     // party is guaranteed to be valid and resolved from partyOwnerId
 *     context.partyApi.rejectInvitation(party, command.actor);
 *     return context;
 *   }
 * );
 * ```
 */
export const withPartyInvitee = <TCommand extends Command & { args: { partyOwnerId: ActorURN } }>(
  reducer: (context: TransformerContext, command: TCommand, party: Party) => TransformerContext
): PureReducer<TransformerContext, TCommand> => {
  return (context, command) => {
    const { world, failed } = context;

    // Validate party owner exists
    const partyOwner = world.actors[command.args.partyOwnerId];
    if (!partyOwner) {
      return failed(command.id, ErrorCode.ACTOR_NOT_FOUND);
    }

    // Resolve the party from the owner
    if (!partyOwner.party) {
      return failed(command.id, ErrorCode.INVARIANT_VIOLATION);
    }

    const party = world.groups[partyOwner.party] as Party;
    if (!party) {
      return failed(command.id, ErrorCode.GROUP_NOT_FOUND);
    }

    return reducer(context, command, party);
  };
};

/**
 * Higher-order function that validates party-related commands and resolves the party
 * from the command actor's own party membership.
 *
 * Used for commands where the actor operates on their own party.
 *
 * This HOF performs the following validations:
 * 1. Ensures the command actor exists (already validated by withBasicWorldStateValidation)
 * 2. Ensures the actor is in a party
 * 3. Resolves and validates the party exists in the world
 *
 * If all validations pass, the resolved party is passed as the third argument
 * to the wrapped reducer function.
 *
 * @param reducer - The reducer function that will receive (context, command, party)
 * @returns A wrapped reducer that performs party validation before execution
 *
 * @example
 * ```typescript
 * const partyLeaveReducer = withOwnPartyValidation(
 *   (context, command, party) => {
 *     // party is guaranteed to be valid and resolved from actor's membership
 *     context.partyApi.removePartyMember(party, command.actor);
 *     return context;
 *   }
 * );
 * ```
 */
export const withOwnParty = <TCommand extends Command>(
  reducer: (context: TransformerContext, command: TCommand, party: Party) => TransformerContext
): PureReducer<TransformerContext, TCommand> => {
  return (context, command) => {
    const { world, failed } = context;

    // Not our job to validate the actor exists
    const actor = world.actors[command.actor];

    // Ensure actor is in a party
    if (!actor.party) {
      return failed(command.id, ErrorCode.INVARIANT_VIOLATION);
    }

    // Resolve the party from actor's membership
    const party = world.groups[actor.party] as Party;
    if (!party) {
      return failed(command.id, ErrorCode.GROUP_NOT_FOUND);
    }

    return reducer(context, command, party);
  };
};

/**
 * Utility function to determine if ownership should be transferred when a party member leaves.
 *
 * @param party - The party to check
 * @param leavingActor - The actor who is leaving
 * @returns true if ownership should be transferred, false otherwise
 */
export const shouldTransferOwnership = (party: Party, leavingActor: ActorURN): boolean => {
  return party.owner === leavingActor && party.size > 1;
};

/**
 * Utility function to find the longest-standing member for ownership transfer.
 *
 * Currently returns the first non-owner member found. In the future, this could
 * be enhanced to track join timestamps and return the actual longest-standing member.
 *
 * @param party - The party to search
 * @returns The ActorURN of the longest-standing member
 * @throws Error if no eligible member is found
 */
export const findLongestStandingMember = (party: Party): ActorURN => {
  // TODO: Implement based on join timestamps when available
  // For now, return first non-owner member
  for (const memberId in party.members) {
    if (memberId !== party.owner) {
      return memberId as ActorURN;
    }
  }
  throw new Error('No eligible member for ownership transfer');
};

export const withGroupOwnerValidation = <TCommand extends Command>(
  reducer: (context: TransformerContext, command: TCommand, party: Party) => TransformerContext
): PureReducer<TransformerContext, TCommand> => {
  return (context: TransformerContext, command: TCommand, party: Party) => {
    const { world, failed } = context;
    const actor = world.actors[command.actor];

    // Only the party owner can kick members
    if (actor.id !== party.owner) {
      return failed(command.id, ErrorCode.FORBIDDEN);
    }

    return reducer(context, command, party);
  };
}
