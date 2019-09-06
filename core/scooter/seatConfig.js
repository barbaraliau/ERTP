import harden from '@agoric/harden';

import { makeCoreMintKeeper } from '../config/coreMintKeeper';
import { seatStrategy } from './seatStrategy';

/**
 * `makeSeatMaker` exists in order to pass in a makeUseObj function.
 * @param  {function} makeUseObj creates a "use object", which has all
 * of the non-ERTP methods for assets that are designed to be used.
 * For instance, a stock might have vote() and claimCashDividends() as
 * methods. The use object is associated with an underlying asset that
 * provides the authority to use it.
 */
function makeSeatConfigMaker(makeUseObjListForPayment, makeUseObjListForPurse) {
  function makeSeatConfig() {
    return harden({
      makeCustomPayment(superPayment, issuer) {
        const payment = harden({
          ...superPayment,
          // This creates a new use object which destroys the payment
          unwrap: () => makeUseObjListForPayment(issuer, payment),
        });
        return payment;
      },
      makeCustomPurse(superPurse, issuer) {
        const purse = harden({
          ...superPurse,
          // This creates a new use object which empties the purse
          unwrap: () => makeUseObjListForPurse(issuer, purse),
        });
        return purse;
      },
      makeCustomMint(superMint) {
        return harden({
          ...superMint,
        });
      },
      makeCustomIssuer(superIssuer) {
        return harden({
          ...superIssuer,
        });
      },
      makeMintKeeper: makeCoreMintKeeper,
      strategy: seatStrategy,
    });
  }
  return makeSeatConfig;
}

export { makeSeatConfigMaker };