import harden from '@agoric/harden';
import natStrategy from '../../config/strategies/natStrategy';

const bothTrue = (prev, curr) => prev && curr;

// rules must be of the forms:
// 1. [haveExactly, haveExactly, wantExactly] (adding liquidity)
// 2. [haveExactly, haveExactly, undefined] (adding liquidity)
// 3. [haveExactly, wantExactly] (offer for first asset)
// 4. [haveExactly, undefined] (offer for first asset)
// 5. [undefined, haveExactly] (offer for second asset)
// 6. [wantExactly, haveExactly] (offer for second asset)

// Rules of length 3 means it is adding to the liquidity pool
// Rules of length 2 means it is an offer to swap

// adding to liquidity pool rules
const hasOkLengthForAddingLiquidity = offer => offer.length === 3;
const hasOkContentForAddingLiquidity = offer =>
  offer[0].rule === 'haveExactly' &&
  offer[1].rule === 'haveExactly' &&
  (offer[2] === undefined || offer[2].rule === 'wantExactly');

// making swap offers rules

const hasOkLengthForSwapping = offer => offer.length === 2;
const hasOkContentForSwapping = offer =>
  (offer[0].rule === 'haveExactly' &&
    (offer[1] === undefined || offer[1].rule === 'wantExactly')) ||
  ((offer[0] === undefined || offer[0].rule === 'wantExactly') &&
    offer[1].rule === 'haveExactly');

// works for both length 2 and 3 offers
const hasOkIssuers = (issuers, offer) => {
  const okIssuers = offer.map(
    (rule, i) => rule[i].amount.label.issuer === issuers[i],
  );
  return okIssuers.reduce(bothTrue);
};

// calculate the fee, quantity out, new pool quantities
// Q stands for Quantity
const calculate = (tokenInPoolQ, tokenOutPoolQ, tokenInQ) => {
  const feeDivisor = 500;
  const feeTokenInQ = natStrategy.divide(tokenInQ, feeDivisor);
  const invariant = natStrategy.multiply(tokenInPoolQ, tokenOutPoolQ);
  const newTokenInPoolQ = natStrategy.with(tokenInPoolQ, tokenInQ);
  const newTokenOutPoolQ = natStrategy.divide(
    invariant,
    natStrategy.without(newTokenInPoolQ, feeTokenInQ),
  );
  const tokenOutQ = natStrategy.without(tokenOutPoolQ, newTokenOutPoolQ);
  return {
    feeTokenInQ,
    tokenOutQ,
    newTokenInPoolQ,
    newTokenOutPoolQ,
  };
};

const isValidSwap = (contractData, issuers, offersSoFar, newOffer) => {
  const { poolQuantities } = contractData;

  let tokenInPoolQ;
  let tokenOutPoolQ;
  let tokenInQ;
  let minTokenOutQ;
  let result = true;

  if (newOffer[0].rule === 'haveExactly') {
    [tokenInPoolQ, tokenOutPoolQ] = poolQuantities;
    tokenInQ = newOffer[0].amount.quantity;
    if (newOffer[1].rule === 'wantAtLeast') {
      minTokenOutQ = newOffer[1].amount.quantity;
    }
  } else {
    [tokenOutPoolQ, tokenInPoolQ] = poolQuantities;
    tokenInQ = newOffer[1].amount.quantity;
    if (newOffer[0].rule === 'wantAtLeast') {
      minTokenOutQ = newOffer[0].amount.quantity;
    }
  }

  try {
    const { tokenOutQ } = calculate(tokenInPoolQ, tokenOutPoolQ, tokenInQ);
    if (
      minTokenOutQ !== undefined &&
      !natStrategy.includes(tokenOutQ, minTokenOutQ)
    ) {
      return false;
    }
  } catch (err) {
    result = false; // we don't want it to throw for nat reasons in a predicate
  }
  return result;
};
const autoswapSrcs = harden({
  areIssuersValid: issuers => issuers.length === 3,
  isValidOffer: (data, issuers, offersSoFar, quantities, newOffer) => {
    let result = hasOkIssuers(issuers, newOffer);
    if (hasOkLengthForAddingLiquidity(newOffer)) {
      result = result && hasOkContentForAddingLiquidity(newOffer);
    } else {
      result =
        result &&
        hasOkLengthForSwapping(newOffer) &&
        hasOkContentForSwapping(newOffer) &&
        isValidSwap(data, issuers, offersSoFar, newOffer);
    }
    return result;
  },
  canAllocate: offers => {},
  allocate: allocations => harden(),
  cancel: allocations => harden(allocations),
});
