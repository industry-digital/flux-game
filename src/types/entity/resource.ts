import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { ResourceURN } from '~/types/taxonomy';

export type ResourceGrowthCurve = {
  /**
   * The current position `t` on the curve, where `t` is on the horizontal axis of an easing curve
   */
  position: number;

  /**
   * The current status of the curve
   */
  status: 'growing' | 'decaying';

  /**
   * When the curve was last updated
   */
  ts: number;
};

export type ResourceNodeState = {
  quantity: number;
  quality: number;
  fullness: NormalizedValueBetweenZeroAndOne;
  curve: ResourceGrowthCurve;
};

export type ResourceNodeStateWithTimestamp = ResourceNodeState & {
  ts: number;
};

export type ResourceNodes = {
  /**
   * When the resources were last updated
   */
  ts: number;

  /**
   * The resource nodes that are present
   */
  nodes: Partial<Record<ResourceURN, ResourceNodeState>>;
};

export type ResourceGenerator = {
  /**
   * The various resource generation policies
   */
  resources: ResourceNodes;
};
