import harden from '@agoric/harden';

const hasOkLength = offer => offer.length === 2;
const hasOkContent = offer =>
  (offer[0].rule === 'haveExactly' && offer[1].rule === 'wantExactly') ||
  (offer[0].rule === 'wantExactly' && offer[1].rule === 'haveExactly');
const hasOkIssuers = (issuers, offer) =>
  offer[0].amount.label.issuer === issuers[0] &&
  offer[1].amount.label.issuer === issuers[1];
const isMatch = (priorOffer, newOffer) =>
  priorOffer[0] === newOffer[1] && priorOffer[1] === newOffer[0];

const swapSrcs = harden({
  isValidOffer: (issuers, offersSoFar, newOffer) => {
    const hasOkFormat =
      hasOkLength(newOffer) &&
      hasOkContent(newOffer) &&
      hasOkIssuers(issuers, newOffer);
    if (offersSoFar.length >= 1) {
      return hasOkFormat && isMatch(offersSoFar[0], newOffer);
    }
    return hasOkFormat;
  },
  canAllocate: offers => {
    return offers.length === 2 && isMatch(offers[0], offers[1]);
  },
  allocate: allocations => harden([allocations[1], allocations[0]]),
  cancel: allocations => harden(allocations),
});
