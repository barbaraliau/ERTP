import harden from '@agoric/harden';

import {
  hasOkIssuers,
  isAddingLiquidity,
  hasOkContentForAddingLiquidity,
  isSwapping,
  hasOkContentForSwapping,
  isValidSwap,
} from './isValidOffer';

import { oneTrue } from '../../utils';

const reallocate = (quantities, offers) => 

const autoswapSrcs = harden({
  areIssuersValid: issuers => issuers.length === 3,
  isValidOffer: (issuers, _offersSoFar, newOffer, data) => {
    // are we adding liquidity or doing a swap? Note that an aim of
    // Zoe is only have a few methods, so that is why we are using
    // this same method for two uses. It's a tradeoff.
    if (isAddingLiquidity(newOffer)) {
      return (
        hasOkIssuers(issuers, newOffer) &&
        hasOkContentForAddingLiquidity(newOffer)
      );
    }
    if (isSwapping(newOffer)) {
      return (
        hasOkIssuers(issuers, newOffer) &&
        hasOkContentForSwapping(newOffer) &&
        isValidSwap(data, newOffer)
      );
    }
    return false;
  },
  // we can reallocate once we have a single swapping offer
  canReallocate: offers => offers.map(isSwapping).reduce(oneTrue),
  reallocate: quantities => harden(),
  cancel: quantities => harden(quantities),
});

export { autoswapSrcs };
