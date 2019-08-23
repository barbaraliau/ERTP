import { allTrue } from '../../utils';
import { calculate } from './constantProduct';

/*
 * An offer is either adding liquidity or trying to swap.
 *
 * Valid formats for adding liquidity:
 *   1. [haveExactly, haveExactly, wantExactly]
 *   2. [haveExactly, haveExactly, undefined]
 *
 * Valid formats for swapping are either offering up the first asset
 * or the second asset, and either specify an amount wanted in return
 * or do not specify the amount wanted in return.
 *
 * Valid formats for swapping and offering up the first asset:
 * 1. [haveExactly, wantExactly]
 * 2. [haveExactly, undefined]
 *
 * Valid formats for swapping and offering up the second asset:
 * 1. [undefined, haveExactly]
 * 2. [wantExactly, haveExactly]
 *
 */

// Rules for adding liquidity
const isAddingLiquidity = offer => offer.length === 3;
const hasOkContentForAddingLiquidity = offer =>
  offer[0].rule === 'haveExactly' &&
  offer[1].rule === 'haveExactly' &&
  (offer[2] === undefined || offer[2].rule === 'wantExactly');

// Rules for swapping an asset
const isSwapping = offer => offer.length === 2;
const hasOkContentForSwapping = offer =>
  (offer[0].rule === 'haveExactly' &&
    (offer[1] === undefined || offer[1].rule === 'wantExactly')) ||
  ((offer[0] === undefined || offer[0].rule === 'wantExactly') &&
    offer[1].rule === 'haveExactly');

// Rules for both adding liquidity and swapping an asset
const hasOkIssuers = (issuers, offer) => {
  return offer
    .map((rule, i) => rule[i].amount.label.issuer === issuers[i])
    .reduce(allTrue);
};

const isValidSwap = (contractData, newOffer) => {
  // Is there a 'wantAtLeast' in the rules? If so, make sure that the
  // amount that would be returned if we performed the swap is greater
  // than or equal to the 'wantAtLeast' amount

  // Are we swapping the first asset kind for the second or vice
  // versa?
  const tokenInIndex = newOffer[0].rule === 'haveExactly' ? 0 : 1;
  const tokenOutIndex = tokenInIndex === 0 ? 1 : 0;

  const { poolQuantities } = contractData;

  const tokenInPoolQ = poolQuantities[tokenInIndex];
  const tokenOutPoolQ = poolQuantities[tokenOutIndex];
  const tokenInQ = newOffer[tokenInIndex].amount.quantity;
  const wantAtLeastQ = newOffer[tokenOutIndex].amount.quantity;

  const { tokenOutQ } = calculate(tokenInPoolQ, tokenOutPoolQ, tokenInQ);
  return wantAtLeastQ === undefined || tokenOutQ >= wantAtLeastQ;
};

export {
  isAddingLiquidity,
  hasOkContentForAddingLiquidity,
  isSwapping,
  hasOkContentForSwapping,
  hasOkIssuers,
  isValidSwap,
};
