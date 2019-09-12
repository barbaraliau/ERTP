const makeState = issuers => {
  const quantities = new WeakMap();
  const offerDescs = new WeakMap();
  const results = new WeakMap();

  const state = {
    status: 'initialized',
    issuers,
    assays: issuers.map(issuer => issuer.getAssay()),
    strategies: issuers.map(issuer => issuer.getStrategy()),
    purses: issuers.map(issuer => issuer.makeEmptyPurse()),
  };
  state.purseQuantities = state.strategies.map(strategy => strategy.empty());
  state.poolQuantities = state.strategies.map(strategy => strategy.empty());
  state.addQuantity = (offerId, quantity) => quantities.set(offerId, quantity);
  state.addOfferDesc = (offerId, offerDesc) =>
    offerDescs.set(offerId, offerDesc);
  state.addResult = (offerId, result) => results.set(offerId, result);
  state.getQuantitiesFor = objIds => objIds.map(objId => quantities.get(objId));
  state.getOfferDescsFor = objIds => objIds.map(objId => offerDescs.get(objId));
  state.getResultsFor = objIds => objIds.map(objId => results.get(objId));
  state.removeOffers = objIds => {
    // has-side-effects
    // eslint-disable-next-line array-callback-return
    objIds.map(objId => {
      quantities.delete(objId);
      offerDescs.delete(objId);
      results.delete(objId);
    });
  };
  return state;
};

export { makeState };
