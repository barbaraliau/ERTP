import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import makePromise from '../../util/makePromise';

import { isOfferSafeForAll, areRightsConserved } from './isOfferSafe';
import { mapArrayOnMatrix } from './utils';

import { makeState } from './state';
import { makeSeatMint } from './seatMint';

const makeScooter = () => {
  // TODO: the seatIssuer should be a long lived identity and should
  // be defined here. For now we are defining it within the
  // installation.

  return harden({
    install: srcs => {
      const { getNextSeatId, seatMint, seatIssuer, addUseObj } = makeSeatMint();
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

      function allocate() {
        const reallocation = srcs.reallocate(state.quantities, state.offers);
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
            const quantity = harden([
              {
                src: srcs.name,
                id: getNextSeatId(),
                offerMade,
              },
            ]);
            const payment = seatMint.mint(quantity);
            const seat = harden({
              claim: () => result.reject('offer was invalid'),
              refund: () => payments,
            });
            addUseObj(quantity[0].id, seat);
            return payment;
          }

          // TODO: handle good offers but some bad payments. We may have
          // already deposited some good payments by the time the bad
          // payments occur.
          await escrow(offerMade, payments);

          // keep the valid offer
          state.offers.push(offerMade);
          state.results.push(result);

          // check if canReallocate whenever a valid offer is made
          if (srcs.canReallocate(state.offers)) {
            allocate();
          }
          const quantity = harden([
            {
              src: srcs.name,
              id: getNextSeatId(),
              offerMade,
            },
          ]);
          const payment = seatMint.mint(quantity);
          const seat = harden({
            claim: () => result.p,
            refund: () => [],
          });
          addUseObj(quantity[0].id, seat);
          return payment;
        };
        return harden(makeOffer);
      };

      return harden({
        async init(issuers, startingInfo) {
          insist(srcs.areIssuersValid(issuers))`issuers are not valid`;
          state = makeState(issuers);
          const wantedOffers = srcs.makeWantedOffers(issuers, startingInfo);
          const payments = wantedOffers.map(offer => {
            const quantity = harden([
              {
                src: srcs.name,
                id: getNextSeatId(),
                offerToBeMade: offer,
              },
            ]);
            addUseObj(
              quantity[0].id,
              harden({ makeOffer: makeOfferMaker(offer) }),
            );
            const purse = seatMint.mint(harden(quantity));
            return purse.withdrawAll();
          });
          // return an array of ERTP payments that have a quantity representing each
          // of the possible seats. When `unwrap` is called on this type
          // of ERTP asset (whether in purse or payment form), the list of
          // associated use objects with a `makeOffer` method is returned
          return payments;
        },
        getIssuers: _ =>
          (state && state.issuers && state.issuers.slice()) || undefined,
        getSeatIssuer: () => seatIssuer,
      });
    },
    // getIssuer: () => seatIssuer,
  });
};
export { makeScooter };
