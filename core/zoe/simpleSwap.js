import harden from '@agoric/harden';

import { makeHasOkRules, offerEqual } from './utils';
import makePromise from '../../util/makePromise';

const makeSimpleSwap = zoeInstance => {
  const escrowReceiptIssuer = zoeInstance.getEscrowReceiptIssuer();

  const hasOkRules = makeHasOkRules([
    ['haveExactly', 'wantExactly'],
    ['wantExactly', 'haveExactly'],
  ]);

  const makeSecondOffer = firstOffer =>
    harden([
      {
        rule: firstOffer[1].rule,
        amount: firstOffer[0].amount,
      },
      {
        rule: firstOffer[0].rule,
        amount: firstOffer[1].amount,
      },
    ]);

  const isValidFirstOfferDesc = newOfferDesc => hasOkRules(newOfferDesc);
  const isValidSecondOfferDesc = (assays, firstOffer, newOfferDesc) =>
    offerEqual(assays, makeSecondOffer(firstOffer), newOfferDesc);

  const reallocate = quantities => harden([quantities[1], quantities[0]]);

  const offers = new WeakMap();
  const validOfferIds = [];

  const isFirstOffer = validOfferIds.length === 0;
  const isSecondOffer = validOfferIds.length === 1;

  const isValidOffer = offerMadeDesc =>
    (isFirstOffer && isValidFirstOfferDesc(offerMadeDesc)) ||
    (isSecondOffer &&
      isValidSecondOfferDesc(
        zoeInstance.getAssays(),
        offers.get(validOfferIds[0]),
        offerMadeDesc,
      ));

  return harden({
    async makeOffer(escrowReceipt) {
      const status = makePromise();
      const escrowReceiptPurse = escrowReceiptIssuer.makeEmptyPurse();
      const amount = await escrowReceiptPurse.depositAll(escrowReceipt);
      const { id, offerMade: offerMadeDesc } = amount.quantity;

      // test if it's a valid offer
      if (!isValidOffer(offerMadeDesc)) {
        status.reject('offer was not valid');
        return {
          getRefund: () => escrowReceiptPurse.withdrawAll(),
          offerMade: status.p,
        };
      }

      // keep the valid offer
      offers.set(id, offerMadeDesc);
      validOfferIds.push(id);
      const quantities = zoeInstance.getQuantitiesFor(validOfferIds);
      if (validOfferIds.length === 2) {
        zoeInstance.allocate(validOfferIds, reallocate(quantities));
      }
      status.res(offerMadeDesc);
      return {
        getRefund: () => undefined,
        offerMade: status.p,
      };
    },
  });
};
export { makeSimpleSwap };
