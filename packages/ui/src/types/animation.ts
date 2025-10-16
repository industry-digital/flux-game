export type AnimationCallbacks = {
  requestAnimationFrame: (callback: () => void) => number;
  cancelAnimationFrame: (id: number) => void;
};

export type AnimationApiResolver = () => AnimationCallbacks;
