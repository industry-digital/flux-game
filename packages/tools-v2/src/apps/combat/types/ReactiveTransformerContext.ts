import type { TransformerContext } from '@flux/core';

/**
 * Enhanced TransformerContext that includes reactive trigger functionality
 *
 * This type extends the pure functional TransformerContext with a forceUpdate
 * method that can trigger UI updates in the reactive trigger pattern.
 */
export interface ReactiveTransformerContext extends TransformerContext {
  /**
   * Trigger a UI update in the reactive system
   *
   * This method should be called whenever the core context state changes
   * and the UI needs to reflect those changes.
   */
  forceUpdate: () => void;
}

/**
 * Create a ReactiveTransformerContext from a plain TransformerContext
 *
 * @param context - The plain TransformerContext
 * @param forceUpdate - The reactive trigger function
 * @returns Enhanced context with reactive capabilities
 */
export function createReactiveContext(
  context: TransformerContext,
  forceUpdate: () => void
): ReactiveTransformerContext {
  return {
    ...context,
    forceUpdate
  };
}
