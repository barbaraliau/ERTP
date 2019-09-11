import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import makePromise from '../../util/makePromise';
import { makeStateMachine } from './stateMachine';
import { makeSeatMint } from './seatMint';

const makeSwap = (zoe, zoeInstance, govC) => {
  const { seatMint, seatIssuer, addUseObj } = makeSeatMint();
  const escrowReceiptIssuer = zoe.getEscrowReceiptIssuer();

  const allowedTransitions = [
    ['open', ['closed', 'cancelled']],
    ['closed', []],
    ['cancelled', []],
  ];

  const sm = makeStateMachine('open', allowedTransitions);

  // Offer description
  const makeOfferMaker = offerToBeMadeDesc => {
    const makeOffer = async escrowReceipt => {
      const offerResult = makePromise();
      // we will either drop this purse or withdraw from it to give a refund
      const escrowReceiptPurse = escrowReceiptIssuer.makeEmptyPurse();
      const amount = await escrowReceiptPurse.depositAll(escrowReceipt);
      const { offerMade: offerMadeDesc } = amount.quantity;
      if (sm.getStatus() !== 'open') {
        offerResult.rej('swap was cancelled');
        return offerResult.p;
        // TODO: refund?
      }

      // fail-fast if the offerDesc isn't valid
      if (
        !govC.isValidOfferDesc(
          zoeInstance.getAssays(),
          offerToBeMadeDesc,
          offerMadeDesc,
        )
      ) {
        offerResult.rej('offer was invalid');
        return offerResult.p;
        // TODO: refund?
      }

      if (
        sm.canTransitionTo('closed') &&
        govC.canReallocate(zoeInstance.getOffers())
      ) {
        sm.transitionTo('closed');
        zoeInstance.allocate(govC.reallocate(zoeInstance.getQuantities()));
      }
      offerResult.res('offer successfully made');
      return offerResult.p;
    };
    return harden(makeOffer);
  };

  const institution = harden({
    async init(escrowReceipt) {
      const { offerMade: offerMadeDesc } = escrowReceipt.getBalance().quantity;
      insist(
        govC.isValidInitialOfferDesc(zoeInstance.getIssuers(), offerMadeDesc),
      )`this offer has an invalid format`;

      const makeOffer = makeOfferMaker(offerMadeDesc);
      const outcome = makeOffer(escrowReceipt);

      const wantedOffers = govC.makeWantedOfferDescs(offerMadeDesc);

      const invites = wantedOffers.map(offer => {
        const quantity = harden({
          src: govC.name,
          id: harden({}),
          offerToBeMade: offer,
        });
        addUseObj(quantity.id, harden({ makeOffer: makeOfferMaker(offer) }));
        const purse = seatMint.mint(harden(quantity));
        return purse.withdrawAll();
      });
      /**
       * Seat: the seat for the initial player
       * Invites: invitations for all of the other seats that can
       * be sent to other players.
       * Both seat and invites are ERTP payments that can be
       * `unwrap`ed to get a use object.
       */
      return harden({
        outcome,
        invites,
      });
    },
    getIssuers: _ => zoeInstance.getIssuers(),
    getStatus: _ => sm.getStatus(),
    getSeatIssuer: _ => seatIssuer,
  });
  return institution;
};
export { makeSwap };
