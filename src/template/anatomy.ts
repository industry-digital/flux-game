import { Template } from "~/types/template";
import { ROOT_NAMESPACE, Taxonomy } from '~/types/taxonomy';
import picomatch from 'picomatch';

/**
 * Return a picomatch function that matches the given subpattern.
 */
const createAnatomyMatcher = (subpattern: string) => picomatch(`${ROOT_NAMESPACE}:anatomy:**:${subpattern}:**`);

const isHead = createAnatomyMatcher('head');
const isNeck = createAnatomyMatcher('neck');
const isLeft = createAnatomyMatcher('left');
const isEye = createAnatomyMatcher('eye');
const isEar = createAnatomyMatcher('ear');
const isArm = createAnatomyMatcher('arm');
const isShoulder = createAnatomyMatcher('shoulder');
const isElbow = createAnatomyMatcher('elbow');
const isHand = createAnatomyMatcher('hand');
const isLeg = createAnatomyMatcher('leg');
const isKnee = createAnatomyMatcher('knee');
const isFoot = createAnatomyMatcher('foot');

type PartMatcher = [name: string, bilateral: boolean, match: (urn: string) => boolean];

const partMatchers: PartMatcher[] = [
  ['head', false, isHead],
  ['neck', false, isNeck],
  ['ear', true, isEar],
  ['eye', true, isEye],
  ['shoulder', true, isShoulder],
  ['arm', true, isArm],
  ['elbow', true, isElbow],
  ['hand', true, isHand],
  ['leg', true, isLeg],
  ['knee', true, isKnee],
  ['foot', true, isFoot],
 ] as const;

export const renderHumanoidAnatomicalPart: Template<Taxonomy.Anatomy> = (urn) => {
  for (const [partName, isBilateral, match] of partMatchers) {
    if (isBilateral) {
      const side = isLeft(urn) ? 'left' : 'right';
      if (match(urn)) {
        return `${side} ${partName}`;
      }
    } else {
      if (match(urn)) {
        return partName;
      }
    }
  }

  return urn;
};
