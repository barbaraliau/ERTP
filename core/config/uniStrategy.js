import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import {
  sameStructure,
  mustBeSameStructure,
  mustBeComparable,
} from '../../util/sameStructure';

const makeUniStrategy = descriptionCoercer => {
  const uniStrategy = harden({
    insistKind: optDescription => {
      if (optDescription === null) {
        return null;
      }
      insist(
        !!optDescription,
      )`Uni optDescription must be either null or truthy: ${optDescription}`;
      mustBeComparable(optDescription);
      const description = descriptionCoercer(optDescription);
      insist(!!description)`Uni description must be truthy ${description}`;
      mustBeComparable(description);
      return description;
    },
    empty: _ => null,
    isEmpty: uni => uni === null,
    includes: (whole, part) => {
      if (part === null) {
        return true;
      }
      return sameStructure(whole, part);
    },
    equals: (left, right) =>
      uniStrategy.includes(left, right) && uniStrategy.includes(right, left),
    with: (left, right) => {
      if (left === null) {
        return right;
      }
      if (right === null) {
        return left;
      }
      if (sameStructure(left, right)) {
        // The "throw" is useless since insist(false) will unconditionally
        // throw anyway. Rather, it informs IDEs of this control flow.
        throw insist(
          false,
        )`Even identical non-empty uni amounts cannot be added together ${left}`;
      } else {
        // The "throw" is useless since insist(false) will unconditionally
        // throw anyway. Rather, it informs IDEs of this control flow.
        throw insist(
          false,
        )`Cannot combine different uni descriptions ${left} vs ${right}`;
      }
    },
    without: (whole, part) => {
      if (part === null) {
        return whole;
      }
      insist(whole !== null)`Empty left does not include ${part}`;

      mustBeSameStructure(
        whole,
        part,
        'Cannot subtract different uni descriptions',
      );
      return uniStrategy.empty();
    },
  });
  return uniStrategy;
};

harden(makeUniStrategy);

export { makeUniStrategy };
