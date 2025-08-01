import { SeededCurvePositionWithValue } from '~/types/easing';
import { ResourceURN } from '~/types/taxonomy';

export type ResourceNodeStatus = 'growing' | 'decaying';

export type ResourceNodeState = SeededCurvePositionWithValue & {
  status: ResourceNodeStatus;
};

/**
 * A record of the position and value of each resource node in the resource curve
 * We deliberately avoid nesting here and opt instead for URNs to keep the data structure compact.
 * Example:
 *  {
 *    'flux:res:tree:oak:position': { position: 0.5, value: 10 },
 *    'flux:res:fruit:berries:position': { position: 0.2, value: 50 },
 *    'ts': 1717171717,
 *  }
 */
export type ResourceNodes = Record<ResourceURN, ResourceNodeState> & {
  /**
   * The timestamp of the last update to the resource nodes
   */
  ts: number;
};
