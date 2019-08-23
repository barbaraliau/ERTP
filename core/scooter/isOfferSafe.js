import { allTrue, transpose } from './utils';

/**
 * @param  {array} assaysPerIssuer - an array of assays ordered in the
 * same order as the corresponding issuers
 * @param  {array} rulesPerIssuer - an array of "rules" ordered in the
 * same order as the corresponding issuers. Rules are a player's
 * understanding of the contract that they are entering when they make
 * an offer. Rules are structured in the form { rule: '', amount}
 * @param  {array} amountsPerIssuer - an array of amounts ordered in
 * the same order as the corresponding issuers. This array of amounts
 * is the reallocation to be given to a player.
 *
 * `isOfferSafeForPlayer` checks offer-safety for a single player.
 *
 * Note: This implementation checks whether we refund for all rules or
 * return winnings for all rules. It does not allow some refunds and
 * some winnings, which is what would happen if you checked the rules
 * independently.
 */
function isOfferSafeForPlayer(
  assaysPerIssuer,
  rulesPerIssuer,
  amountsPerIssuer,
) {
  // Is the amount greater than or equal to the amount in the offer?
  const isAmountOfferSafe = (assay, amount, rule) => {
    return assay.includes(amount, rule.amount);
  };

  // If we are refunding the player, are their allocated amounts
  // greater than or equal to what they said they had at the beginning?
  const refundOk = rulesPerIssuer
    .map((rule, i) => {
      // If the rule was 'haveExactly', we should make sure that the
      // user gets it back in a refund. If it is not 'haveExactly' anything
      // we give back is fine.
      if (rule.rule === 'haveExactly') {
        return isAmountOfferSafe(assaysPerIssuer[i], amountsPerIssuer[i], rule);
      }
      return true;
    })
    .reduce(allTrue);

  // If we are not refunding the player, are their allocated amounts
  // greater than or equal to what they said they wanted at the beginning?
  const winningsOk = rulesPerIssuer
    .map((rule, i) => {
      // If the rule was 'wantExactly' or 'wantAtLeast', we should make
      // sure that the user gets what they wanted. If it is not,
      // anything we give back is fine.
      if (rule.rule === 'wantExactly' || rule.rule === 'wantAtLeast') {
        return isAmountOfferSafe(assaysPerIssuer[i], amountsPerIssuer[i], rule);
      }
      return true;
    })
    .reduce(allTrue);

  return refundOk || winningsOk;
}
/**
 * @param  {array} assays - An array of assays in the same order as
 * their corresponding issuers
 * @param  {matrix} offerMatrix - an array of arrays. Each of the
 * element arrays is the offer (array of rules) that a single player
 * made. In the same order as the corresponding issuers.
 * @param  {matrix} amountMatrix - an array of arrays. Each of the
 * element arrays is the array of amounts that a single player will
 * get. In the same order as the corresponding issuers.
 */
function isOfferSafeForAll(assays, offerMatrix, amountMatrix) {
  return offerMatrix
    .map((rulesForPlayer, i) => {
      const amountsPerPlayer = amountMatrix[i];
      return isOfferSafeForPlayer(assays, rulesForPlayer, amountsPerPlayer);
    })
    .reduce(allTrue);
}
/**
 * @param  {array} strategies - the strategies per issuer, in the same
 * order as the corresponding issuers array.
 * @param  {array} purseQuantities - the quantities per purse, in the
 * same order as the corresponding issuers array.
 * @param  {matrix} quantitiesMatrix - array of arrays where the
 * element array is the quantities for a particular player, per
 * issuer.
 */
function areRightsConserved(strategies, purseQuantities, quantitiesMatrix) {
  // The columns in a quantitiesMatrix are per issuer, and the rows
  // are per player. We want to transpose the matrix such that each
  // row is per issuer so we can do 'with' on the array to get a total
  // per issuer and make sure the rights are conserved.
  const transposedQuantities = transpose(quantitiesMatrix);
  const totalsPerIssuer = transposedQuantities.map((quantitiesPerIssuer, i) => {
    return quantitiesPerIssuer.reduce(strategies[i].with);
  });
  const equalPerIssuer = totalsPerIssuer.map((total, i) =>
    strategies[i].equals(total, purseQuantities[i]),
  );
  return equalPerIssuer.reduce(allTrue);
}

export { isOfferSafeForPlayer, isOfferSafeForAll, areRightsConserved };