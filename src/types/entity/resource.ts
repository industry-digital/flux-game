import { ResourceURN } from "@flux";
import { DimensionURN } from '~/types/taxonomy';
import { Duration } from '~/types/world/time';

export type AbstractResource<ResourceType extends ResourceURN> = {

  /**
   * The type of resource
   */
  type: ResourceType;

  /**
   * The unit of measure for the resource
   */
  uom: DimensionURN;
};

/**
 * A resource that can be generated over time
 */
export type GeneratedResource<ResourceType extends ResourceURN> = AbstractResource<ResourceType> & {
  /**
   * Current quantity of the resource available
   */
  available: number;

  /**
   * Maximum quantity that can be accumulated
   */
  capacity: number;

  /**
   * Generation rate per time unit
   */
  rate: {
    quantity: number;
    period: Duration;
  };

  /**
   * When this resource was last updated (for calculating accumulated generation)
   */
  ts: number; // timestamp in milliseconds
};

export type ResourceGenerator = {
  resources: Record<ResourceURN, GeneratedResource<ResourceURN>>;
};
