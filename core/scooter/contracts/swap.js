import harden from '@agoric/harden';

import {
  makeHasOkLength,
  makeHasOkRules,
  hasOkIssuers,
  ruleEqual,
  allAmountsEqual,
} from '../utils';

const hasOkLength = makeHasOkLength(2);
const hasOkRules = makeHasOkRules([
  ['haveExactly', 'wantExactly'],
  ['wantExactly', 'haveExactly'],
]);

const swappedRules = (priorOffer, newOffer) =>
  ruleEqual(priorOffer[0], newOffer[1]) &&
  ruleEqual(priorOffer[1], newOffer[0]);

const isMatch = (assays, priorOffer, newOffer) =>
  swappedRules(priorOffer, newOffer) &&
  allAmountsEqual(assays, priorOffer, newOffer);

const swapSrcs = harden({
  startState: 'empty',
  allowedTransitions: [
    ['empty', ['open']],
    ['open', ['reallocating', 'cancelled']],
    ['reallocating', ['closed']],
    ['cancelled', []],
    ['closed', []],
  ],
  areIssuersValid: hasOkLength,
  isValidOffer: (issuers, assays, offersSoFar, newOffer, _quantities) => {
    const hasOkFormat =
      hasOkLength(newOffer) &&
      hasOkRules(newOffer) &&
      hasOkIssuers(issuers, newOffer);
    if (offersSoFar.length >= 1) {
      return hasOkFormat && isMatch(assays, offersSoFar[0], newOffer);
    }
    return hasOkFormat;
  },
  canReallocate: offers => offers.length === 2, // we can reallocate with 2 valid offers
  reallocate: allocations => harden([allocations[1], allocations[0]]),
  cancel: allocations => harden(allocations),
});

harden(swapSrcs);

export { swapSrcs };
