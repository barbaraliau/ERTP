import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import makePromise from '../../util/makePromise';

import { isOfferSafeForAll, areRightsConserved } from './isOfferSafe';
import { mapArrayOnMatrix } from './utils';

import { makeState } from './state';
import { makeSeatMint } from './seatMint';

const makeZoe = () => {
  // The seat issuer is a long lived identity over many contract installations
  const { getNextSeatId, seatMint, seatIssuer, addUseObj } = makeSeatMint();

  return harden({
    install: srcs => {
      let state;

      // Escrow does the escrowing, but also updates the `purseQuantities`
      // (the current balance of the purses) and `quantities` (the amount
      // escrowed per player per issuer)
      async function escrow(rules, payments) {
        const quantitiesForPlayerPromises = state.purses.map(
          async (purse, i) => {
            // if the user's contractual understanding includes
            // "haveExactly", make sure that they have supplied the
            // coordinating payment
            if (rules[i].rule === 'haveExactly') {
              const amount = await purse.depositExactly(
                rules[i].amount,
                payments[i],
              );
              return amount.quantity;
            }
            return state.strategies[i].empty();
          },
        );

        const quantitiesForPlayer = await Promise.all(
          quantitiesForPlayerPromises,
        );
        // has side-effects
        // eslint-disable-next-line array-callback-return
        quantitiesForPlayer.map((quantity, i) => {
          state.purseQuantities[i] = state.strategies[i].with(
            state.purseQuantities[i],
            quantity,
          );
        });
        state.quantities.push(quantitiesForPlayer);
      }

      function toAmountMatrix(assays, quantitiesMatrix) {
        const assayMakes = assays.map(assay => assay.make);
        return mapArrayOnMatrix(quantitiesMatrix, assayMakes);
      }

      function makePayments(amountsMatrix) {
        return amountsMatrix.map(row =>
          row.map((amount, i) => state.purses[i].withdraw(amount, 'payout')),
        );
      }

      function allocate(reallocation) {
        insist(
          areRightsConserved(
            state.strategies,
            state.purseQuantities,
            reallocation,
          ),
        )`Rights are not conserved in the proposed reallocation`;

        const amounts = toAmountMatrix(state.assays, reallocation);
        insist(
          isOfferSafeForAll(state.assays, state.offers, amounts),
        )`The proposed reallocation was not offer safe`;

        const payments = makePayments(amounts);
        state.results.map((result, i) => result.res(payments[i]));
      }

      const makeOfferMaker = offerToBeMade => {
        const makeOffer = async (offerMade, payments) => {
          const result = makePromise();
          // fail-fast if the offer isn't valid
          if (!srcs.isValidOffer(state.assays, offerToBeMade, offerMade)) {
            const quantity = harden({
              src: srcs.name,
              id: getNextSeatId(),
              offerMade,
            });
            const payment = seatMint.mint(quantity);
            const seat = harden({
              claim: () => result.reject('offer was invalid'),
              refund: () => payments,
            });
            addUseObj(quantity.id, seat);
            return payment;
          }

          // TODO: handle good offers but some bad payments. We may have
          // already deposited some good payments by the time the bad
          // payments occur.
          await escrow(offerMade, payments);

          // keep the valid offer
          state.offers.push(offerMade);
          state.results.push(result);

          const quantity = harden({
            src: srcs.name,
            id: getNextSeatId(),
            offerMade,
          });
          const payment = seatMint.mint(quantity);
          const seat = harden({
            claim: () => {
              if (srcs.canReallocate(state.status, state.offers)) {
                state.status = 'closed';
                allocate(srcs.reallocate(state.quantities));
              }
              return result.p;
            },
            cancel: () => {
              if (state.status === 'open') {
                state.status = 'cancelled';
                allocate(state.quantities);
              }
              return result.p;
            },
          });
          addUseObj(quantity.id, seat);
          return payment;
        };
        return harden(makeOffer);
      };

      const institution = harden({
        async init(issuers, initialOffer, initialOfferPayments) {
          insist(srcs.areIssuersValid(issuers))`issuers are not valid`;
          state = makeState(issuers);

          insist(
            srcs.isValidInitialOffer(state.issuers, initialOffer),
          )`this offer has an invalid format`;

          state.status = 'open';

          const makeOffer = makeOfferMaker(initialOffer);
          const seat = makeOffer(initialOffer, initialOfferPayments);

          // not all governing contracts will use offerInvites. Some
          // will have a public function on the zoe institution.
          // TODO: handle both cases
          const wantedOffers = srcs.makeWantedOffers(initialOffer);

          const invites = wantedOffers.map(offer => {
            const quantity = harden({
              src: srcs.name,
              id: getNextSeatId(),
              offerToBeMade: offer,
            });
            addUseObj(
              quantity.id,
              harden({ makeOffer: makeOfferMaker(offer) }),
            );
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
        getIssuers: _ =>
          (state && state.issuers && state.issuers.slice()) || undefined,
        getStatus: _ => (state && state.status) || undefined,
      });
      return institution;
    },
    getIssuer: () => seatIssuer,
  });
};
export { makeZoe };
