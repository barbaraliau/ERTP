import harden from '@agoric/harden';

import { calcSwap } from './calcSwap';
import { allTrue } from '../../utils';

/*
 * Valid formats for swapping are either offering up the first asset
 * or the second asset
 *
 * Valid formats for swapping and offering up the first asset:
 * 1. [haveExactly, wantExactly]
 *
 * Valid formats for swapping and offering up the second asset:
 * 2. [wantExactly, haveExactly]
 */

// Rules for swapping an asset

const okIssuers = (issuers, offer) => {
  return offer
    .map((rule, i) => rule[i].amount.label.issuer === issuers[i])
    .reduce(allTrue);
};

const okLength = offer => offer.length === 2;

const okContent = offer =>
  (offer[0].rule === 'haveExactly' && offer[1].rule === 'wantExactly') ||
  (offer[0].rule === 'wantExactly' && offer[1].rule === 'haveExactly');

const okSwap = (quantities, newOffer) => {
  // Is there a 'wantAtLeast' in the rules? If so, make sure that the
  // amount that would be returned if we performed the swap is greater
  // than or equal to the 'wantAtLeast' amount

  // Are we swapping the first asset kind for the second or vice
  // versa?
  const tokenInIndex = newOffer[0].rule === 'haveExactly' ? 0 : 1;
  const tokenOutIndex = tokenInIndex === 0 ? 1 : 0;

  const poolQuantities = quantities[0];

  const tokenInQ = newOffer[tokenInIndex].amount.quantity;
  const wantAtLeastQ = newOffer[tokenOutIndex].amount.quantity;

  const { tokenOutQ } = calcSwap(
    poolQuantities[tokenInIndex],
    poolQuantities[tokenOutIndex],
    tokenInQ,
  );
  return wantAtLeastQ === undefined || tokenOutQ >= wantAtLeastQ;
};

const isValidSwap = harden({
  okIssuers,
  okLength,
  okContent,
  okSwap,
});

export { isValidSwap };
