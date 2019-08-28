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
function makeSeatConfigMaker(makeUseObj) {
  function makeSeatConfig() {
    return harden({
      makePaymentTrait(superPayment, issuer) {
        return harden({
          // This creates a new use object on every call.
          unwrap: () => makeUseObj(issuer, superPayment),
        });
      },
      makePurseTrait(superPurse, issuer) {
        return harden({
          // This creates a new use object on every call.
          unwrap: () => makeUseObj(issuer, superPurse),
        });
      },
      makeMintTrait(_superMint) {
        return harden({});
      },
      makeIssuerTrait(_superIssuer) {
        return harden({});
      },
      makeMintKeeper: makeCoreMintKeeper,
      strategy: seatStrategy,
    });
  }
  return makeSeatConfig;
}

export { makeSeatConfigMaker };
