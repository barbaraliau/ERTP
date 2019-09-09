const makeState = issuers => {
  const state = {
    status: 'initialized',
    issuers,
    assays: issuers.map(issuer => issuer.getAssay()),
    strategies: issuers.map(issuer => issuer.getStrategy()),
    results: [], // promises that need to be resolved to payments per player
    offers: [], // matrix: rules per player
    quantities: [], // matrix: quantities per player
    purses: issuers.map(issuer => issuer.makeEmptyPurse()),
  };
  state.purseQuantities = state.strategies.map(strategy => strategy.empty());
  return state;
};

export { makeState };
