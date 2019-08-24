import harden from '@agoric/harden';

const hasOkLength = offer => offer.length === 2;
const hasOkContent = offer =>
  (offer[0].rule === 'haveExactly' && offer[1].rule === 'wantExactly') ||
  (offer[0].rule === 'wantExactly' && offer[1].rule === 'haveExactly');
const hasOkIssuers = (issuers, offer) =>
  offer[0].amount.label.issuer === issuers[0] &&
  offer[1].amount.label.issuer === issuers[1];
const isMatch = (assays, priorOffer, newOffer) =>
  priorOffer[0].rule === newOffer[1].rule &&
  priorOffer[1].rule === newOffer[0].rule &&
  assays[0].equals(priorOffer[0].amount, newOffer[0].amount) &&
  assays[1].equals(priorOffer[1].amount, newOffer[1].amount);

const swapSrcs = harden({
  startState: 'empty',
  allowedTransitions: [
    ['empty', ['open']],
    ['open', ['reallocating', 'cancelled']],
    ['reallocating', ['dispersing']],
    ['dispersing', ['closed']],
    ['cancelled', []],
    ['closed', []],
  ],
  areIssuersValid: issuers => issuers.length === 2,
  isValidOffer: (issuers, assays, offersSoFar, newOffer, _quantities) => {
    const hasOkFormat =
      hasOkLength(newOffer) &&
      hasOkContent(newOffer) &&
      hasOkIssuers(issuers, newOffer);
    if (offersSoFar.length >= 1) {
      return hasOkFormat && isMatch(assays, offersSoFar[0], newOffer);
    }
    return hasOkFormat;
  },
  canReallocate: offers => {
    return offers.length === 2;
  },
  reallocate: allocations => harden([allocations[1], allocations[0]]),
  cancel: allocations => harden(allocations),
});

harden(swapSrcs);

export { swapSrcs };
