import harden from '@agoric/harden';

const makeState = issuers => {
  const quantities = new WeakMap();
  const offers = new WeakMap();
  const results = new WeakMap();
  const purses = issuers.map(issuer => issuer.makeEmptyPurse());

  const readOnlyState = harden({
    issuers,
    assays: issuers.map(issuer => issuer.getAssay()),
    strategies: issuers.map(issuer => issuer.getStrategy()),
    getIssuers: () => issuers,
    getAssays: () => readOnlyState.assays,
    getStrategies: () => readOnlyState.strategies,
    getQuantitiesFor: objIds => objIds.map(objId => quantities.get(objId)),
    getOfferDescsFor: objIds => objIds.map(objId => offers.get(objId)),
  });

  const adminState = harden({
    getPurses: () => purses,
    setOffer: (offerId, offerDesc) => offers.set(offerId, offerDesc),
    setResult: (offerId, result) => results.set(offerId, result),
    setQuantity: (offerId, quantity) => quantities.set(offerId, quantity),
    setQuantitiesFor: (objIds, reallocation) =>
      objIds.map((objId, i) => quantities.set(objId, reallocation[i])),
    getResultsFor: objIds => objIds.map(objId => results.get(objId)),
    removeOffers: objIds => {
      // has-side-effects
      // eslint-disable-next-line array-callback-return
      objIds.map(objId => {
        quantities.delete(objId);
        offers.delete(objId);
        results.delete(objId);
      });
    },
  });
  return {
    adminState,
    readOnlyState,
  };
};

export { makeState };
