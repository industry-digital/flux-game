import { ResourceURN } from '~/types/taxonomy';

export type ResourceCurvePosition = `${ResourceURN}:position`;
export type ResourceCurveValue = `${ResourceURN}:value`;
export type ResourceCurveURN = ResourceCurvePosition | ResourceCurveValue;

/**
 * A record of the position and value of each resource node in the resource curve
 * We deliberately avoid nesting here and opt instead for URNs to keep the data structure compact.
 * Example:
 *  {
 *    'flux:resource:apple:position': 0.5,
 *    'flux:resource:apple:value': 10,
 *    'flux:resource:wood:oak:position': 0.2,
 *    'flux:resource:wood:oak:value': 50,
 *    'ts': 1717171717,
 *  }
 */
export type ResourceNodes = Record<ResourceCurveURN, number> & {
  /**
   * The timestamp of the last update to the resource nodes
   */
  ts: number;
};
