import { ResourceURN } from "@flux";
import { DimensionURN } from '~/types/taxonomy';
import { WellKnownDuration } from '~/types/world/time';

export type AbstractResource = {

  /**
   * The unit of measure for the resource
   */
  uom: DimensionURN;
};

/**
 * Growth curves for resource production
 */
export enum ProductionCurve {
  /**
   * Linear growth - constant rate regardless of current amount
   * Good for: mining, crystal formation, manufactured goods
   */
  LINEAR = 'linear',

  /**
   * Logistic growth - S-curve that slows as capacity is approached
   * Good for: biological resources (grass, trees, animal populations)
   */
  LOGISTIC = 'logistic',

  /**
   * No growth - static resource amount
   * Good for: finite deposits, special event resources
   */
  NONE = 'none'
}

export type ProductionRate = {
  quantity: number;
  period: WellKnownDuration;
  curve?: ProductionCurve; // Defaults to LOGISTIC
};

export type ConsumptionRate = ProductionRate;

/**
 * A resource that can be generated over time
 */
export type ResourceNode = AbstractResource & {
  /**
   * Unit of measure for the resource
   */
  uom: DimensionURN;

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
  production: ProductionRate;
};

export type ResourceNodes = {
  /**
   * When the resources were last updated
   */
  ts: number;

  /**
   * The resources that are being generated
   */
  nodes: Partial<Record<ResourceURN, ResourceNode>>;
};

export type ResourceGenerator = {

  /**
   * The various resource generation policies
   */
  resources: ResourceNodes;
};
