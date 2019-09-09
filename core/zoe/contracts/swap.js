import harden from '@agoric/harden';

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
  // TODO: this name should be in the namespace of the smart contract library
  name: 'swap',
  areIssuersValid: hasOkLength,
  isValidInitialOffer: (issuers, newOffer) =>
    hasOkLength(newOffer) &&
    hasOkRules(newOffer) &&
    hasOkIssuers(issuers, newOffer),
  makeWantedOffers: firstOffer => {
    return harden([makeSecondOffer(firstOffer)]);
  },
  isValidOffer: (assays, offerToBeMade, offerMade) =>
    offerEqual(assays, offerToBeMade, offerMade),
  canReallocate: (status, offers) => status === 'open' && offers.length === 2, // we can reallocate with 2 valid offers
  reallocate: allocations => harden([allocations[1], allocations[0]]),
});

harden(swapSrcs);

export { swapSrcs };
