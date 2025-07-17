import { ResourceNodeState } from '~/types/schema/resource';
import { ResourceURN } from '~/types/taxonomy';

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
