import harden from '@agoric/harden';

import isValidOffer from './isValidOffer';
import isAddingLiquidity from './isAddingLiquidity';
import { reallocate } from './reallocate';

const autoswapSrcs = harden({
  areIssuersValid: issuers => issuers.length === 2,
  isValidOffer: (issuers, _offersSoFar, newOffer, quantities) => {
    return (
      isValidOffer.okLength(newOffer) &&
      isValidOffer.okIssuers(issuers, newOffer) &&
      isValidOffer.okContent(newOffer) &&
      isValidOffer.okSwap(quantities, newOffer)
    );
  },
  isValidAddingLiquidity: (issuers, _offersSoFar, newOffer, _data) => {
    return (
      isValidOffer.okLength(newOffer) &&
      isValidOffer.okIssuers(issuers, newOffer) &&
      isAddingLiquidity.okContent(newOffer)
    );
  },
  // we can reallocate once we have a single swapping offer
  canReallocate: offers => offers.length === 2,
  reallocate,
  cancel: quantities => harden(quantities),
});

export { autoswapSrcs };
