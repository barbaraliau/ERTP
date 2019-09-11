import harden from '@agoric/harden';

import { insist } from '../../util/insist';

import { isOfferSafeForAll, areRightsConserved } from './isOfferSafe';
import { mapArrayOnMatrix } from './utils';

import { makeState } from './state';
import { makeSeatMint } from './seatMint';

const makeZoe = () => {
  // The seat issuer is a long lived identity over many contract installations
  const { getNextSeatId, seatMint, seatIssuer, addUseObj } = makeSeatMint();

  return harden({
    makeInstance: issuers => {
      const state = makeState(issuers);

      function toAmountMatrix(assays, quantitiesMatrix) {
        const assayMakes = assays.map(assay => assay.make);
        return mapArrayOnMatrix(quantitiesMatrix, assayMakes);
      }

      function makePayments(amountsMatrix) {
        return amountsMatrix.map(row =>
          row.map((amount, i) => state.purses[i].withdraw(amount, 'payout')),
        );
      }

      // For now, these are assumed to be called by the middle layer,
      // but we actually want the end user to be able to make an offer
      // directly to zoe, then the middle layer can ask about it.

      const instance = harden({
        // Escrow does the escrowing, but also updates the `purseQuantities`
        // (the current balance of the purses) and `quantities` (the amount
        // escrowed per player per issuer)
        escrow: async (offerDesc, payments, result) => {
          const quantitiesForPlayerPromises = state.purses.map(
            async (purse, i) => {
              // if the user's contractual understanding includes
              // "haveExactly", make sure that they have supplied the
              // coordinating payment
              if (offerDesc[i].rule === 'haveExactly') {
                const amount = await purse.depositExactly(
                  offerDesc[i].amount,
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

          // keep the valid offer
          state.offerDescs.push(offerDesc);
          state.results.push(result);
        },
        // reallocation is a quantitiesMatrix
        allocate: reallocation => {
          insist(
            areRightsConserved(
              state.strategies,
              state.purseQuantities,
              reallocation,
            ),
          )`Rights are not conserved in the proposed reallocation`;

          const amounts = toAmountMatrix(state.assays, reallocation);
          insist(
            isOfferSafeForAll(state.assays, state.offerDescs, amounts),
          )`The proposed reallocation was not offer safe`;

          const payments = makePayments(amounts);
          state.results.map((result, i) => result.res(payments[i]));
        },
        getIssuers: _ =>
          (state && state.issuers && state.issuers.slice()) || undefined,
        getSeatMint: _ =>
          harden({
            getNextSeatId,
            seatMint,
            seatIssuer,
            addUseObj,
          }),
        getAssays: _ => state.assays,
        getQuantities: _ => state.quantities,
        getOffers: _ => state.offerDescs,
      });
      return instance;
    },
    getIssuer: () => seatIssuer,
  });
};
export { makeZoe };
