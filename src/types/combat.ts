export enum TargetType {
  NONE = 'none',
  SELF = 'self',
  SINGLE = 'single',
  ANATOMY = 'single:anatomy',
  MULTI = 'single:multi',
  AREA = 'area',
  PLACE = 'place',
}

export type TargetingSpecification = {
  /**
   * The type of target
   */
  type: TargetType;

  /**
   * Distance in meters; `0` means touch
   */
  range?: number;

  /**
   * Requires line of sight?
   */
  los?: boolean;

  /**
   * Maximum number of targets
   */
  max?: number;         // For multi-target abilities
};
