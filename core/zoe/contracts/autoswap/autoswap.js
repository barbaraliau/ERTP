import harden from '@agoric/harden';
import { reallocate } from './reallocate';
import { calcSwap } from './calcSwap';

import {
  makeHasOkLength,
  makeHasOkRules,
  hasOkIssuers,
} from '../../utils/utils';

const hasOkLength = makeHasOkLength(3);
const hasOkRules = makeHasOkRules([
  ['haveExactly', 'wantExactly'],
  ['wantExactly', 'haveExactly'],
]);

const okSwap = (poolQuantities, newOffer) => {
  // Is there a 'wantAtLeast' in the rules? If so, make sure that the
  // amount that would be returned if we performed the swap is greater
  // than or equal to the 'wantAtLeast' amount

  // Are we swapping the first asset kind for the second or vice
  // versa?
  const tokenInIndex = newOffer[0].rule === 'haveExactly' ? 0 : 1;
  const tokenOutIndex = tokenInIndex === 0 ? 1 : 0;

  const tokenInQ = newOffer[tokenInIndex].amount.quantity;
  const wantAtLeastQ = newOffer[tokenOutIndex].amount.quantity;

  const { tokenOutQ } = calcSwap(
    poolQuantities[tokenInIndex],
    poolQuantities[tokenOutIndex],
    tokenInQ,
  );
  return wantAtLeastQ === undefined || tokenOutQ >= wantAtLeastQ;
};

const getPrice = (poolQuantities, assays, amountsIn) => {
  const tokenInIndex = amountsIn[0] === undefined ? 1 : 0;
  const tokenOutIndex = 1 - tokenInIndex;

  const tokenInQ = amountsIn[tokenInIndex].quantity;
  const { tokenOutQ } = calcSwap(
    poolQuantities[tokenInIndex],
    poolQuantities[tokenOutIndex],
    tokenInQ,
  );
  return assays[tokenOutIndex].make(tokenOutQ);
};

/*
 * Valid format for adding liquidity:
 * [
 *   {
 *      rule: 'haveExactly',
 *      amount: amount1,
 *   },
 *   {
 *      rule: 'haveExactly',
 *      amount: amount2,
 *   }
 * ]
 */

const okAddingLiquidityRules = offer =>
  offer[0].rule === 'haveExactly' &&
  offer[1].rule === 'haveExactly' &&
  offer[2].rule === 'wantAtLeast';

const autoswapSrcs = harden({
  name: 'autoswap',
  areIssuersValid: makeHasOkLength(2),
  isValidOffer: (issuers, newOffer, poolQuantities) => {
    return (
      makeHasOkLength(2)(newOffer) &&
      hasOkRules(newOffer) &&
      hasOkIssuers(issuers.slice(0, 1), newOffer) &&
      okSwap(poolQuantities, newOffer)
    );
  },
  isValidOfferAddingLiquidity: (issuers, newOffer) => {
    return (
      hasOkLength(newOffer) &&
      hasOkIssuers(issuers, newOffer) &&
      okAddingLiquidityRules(newOffer)
    );
  },
  // we can reallocate once we have a single swapping offer
  canReallocate: (status, offers) => status === 'open' && offers.length === 1,
  reallocate,
  cancel: quantities => harden(quantities),
  getPrice,
});

export { autoswapSrcs };

// FYI: Swap methods:
//  isValidInitialOffer: (issuers, newOffer) =>
//    hasOkLength(newOffer) &&
//    hasOkRules(newOffer) &&
//    hasOkIssuers(issuers, newOffer),
//  makeWantedOffers: firstOffer => {
//    return harden([makeSecondOffer(firstOffer)]);
//  },
//  isValidOffer: (assays, offerToBeMade, offerMade) =>
//    offerEqual(assays, offerToBeMade, offerMade),
