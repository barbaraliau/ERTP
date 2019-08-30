import harden from '@agoric/harden';

import { insist } from '../../../util/insist';

import {
  makeHasOkLength,
  makeHasOkRules,
  hasOkIssuers,
  offerEqual,
} from '../utils';

const hasOkLength = makeHasOkLength(2);
const hasOkRules = makeHasOkRules([
  ['haveExactly', 'wantExactly'],
  ['wantExactly', 'haveExactly'],
]);

const makeSecondOffer = firstOffer => {
  return [
    {
      rule: firstOffer[1].rule,
      amount: firstOffer[0].amount,
    },
    {
      rule: firstOffer[0].rule,
      amount: firstOffer[1].amount,
    },
  ];
};

const swapSrcs = harden({
  name: 'swap',
  areIssuersValid: hasOkLength,
  makeWantedOffers: (issuers, newOffer) => {
    // for swap, a single offer defines the other offer.
    insist(
      hasOkLength(newOffer) &&
        hasOkRules(newOffer) &&
        hasOkIssuers(issuers, newOffer),
    )`the offer does not have the correct format`;
    return harden([newOffer, makeSecondOffer(newOffer)]);
  },
  isValidOffer: (assays, offerToBeMade, offerMade) =>
    offerEqual(assays, offerToBeMade, offerMade),
  canReallocate: offers => offers.length === 2, // we can reallocate with 2 valid offers
  reallocate: allocations => harden([allocations[1], allocations[0]]),
  cancel: allocations => harden(allocations),
});

harden(swapSrcs);

export { swapSrcs };
