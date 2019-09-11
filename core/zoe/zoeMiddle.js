import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import makePromise from '../../util/makePromise';
import { makeStateMachine } from './stateMachine';

const makeSwap = (zoeInstance, govC) => {
  const { getNewIdObj, seatMint, addUseObj } = zoeInstance.getSeatMint();

  const allowedTransitions = [
    ['open', ['closed', 'cancelled']],
    ['closed', []],
    ['cancelled', []],
  ];

  const sm = makeStateMachine('open', allowedTransitions);

  // Offer description
  const makeOfferMaker = offerDescToBeMade => {
    const makeOffer = async (offerDescMade, payments) => {
      const result = makePromise();
      if (sm.getStatus() !== 'open') {
        result.reject('swap was cancelled');
        // TODO: we need to enforce offer safety on this refund
        return result.p;
      }

      // fail-fast if the offerDesc isn't valid
      if (
        !govC.isValidOfferDesc(
          zoeInstance.getAssays(),
          offerDescToBeMade,
          offerDescMade,
        )
      ) {
        result.res(payments);
        return result.p;
      }

      // TODO: handle good offers but some bad payments. We may have
      // already deposited some good payments by the time the bad
      // payments occur.
      await zoeInstance.escrow(offerDescMade, payments, result);

      const quantity = harden({
        src: govC.name,
        id: getNewIdObj(),
        offerMade: offerDescMade,
      });
      const payment = seatMint.mint(quantity);
      const seat = harden({
        getWinnings: () => result.p,
        cancel: () => {
          if (sm.canTransitionTo('cancelled')) {
            sm.transitionTo('cancelled');
            zoeInstance.allocate(zoeInstance.getQuantities());
          }
          return result.p;
        },
      });
      addUseObj(quantity.id, seat);

      if (
        sm.canTransitionTo('closed') &&
        govC.canReallocate(zoeInstance.getOffers())
      ) {
        sm.transitionTo('closed');
        zoeInstance.allocate(govC.reallocate(zoeInstance.getQuantities()));
      }
      return payment;
    };
    return harden(makeOffer);
  };

  const institution = harden({
    async init(initialOffer, initialOfferPayments) {
      insist(
        govC.isValidInitialOfferDesc(zoeInstance.getIssuers(), initialOffer),
      )`this offer has an invalid format`;

      const makeOffer = makeOfferMaker(initialOffer);
      const seat = makeOffer(initialOffer, initialOfferPayments);

      const wantedOffers = govC.makeWantedOfferDescs(initialOffer);

      const invites = wantedOffers.map(offer => {
        const quantity = harden({
          src: govC.name,
          id: getNewIdObj(),
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
        seat,
        invites,
      });
    },
    getIssuers: _ => zoeInstance.getIssuers(),
    getStatus: _ => sm.getStatus(),
  });
  return institution;
};
export { makeSwap };
