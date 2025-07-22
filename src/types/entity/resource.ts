import { NormalizedValueBetweenZeroAndOne } from '~/types/entity/attribute';
import { ResourceURN } from '~/types/taxonomy';

export type ResourceNodeState = {
  quantity: number;
  quality: number;
  fullness: NormalizedValueBetweenZeroAndOne;
  last: {
    growth: number; // timestamp
    decay: number; // timestamp
  };
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
