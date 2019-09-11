import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import makePromise from '../../util/makePromise';
import { isOfferSafeForAll, areRightsConserved } from './isOfferSafe';
import { mapArrayOnMatrix } from './utils';

import { makeState } from './state';
import { makeSeatMint } from './seatMint';
import { makeEscrowReceiptConfig } from './escrowReceiptConfig';
import { makeMint } from '../issuers';

const makeZoe = () => {
  // The seat issuer is a long lived identity over many contract installations
  const { getNewIdObj, seatMint, seatIssuer, addUseObj } = makeSeatMint();
  const escrowReceiptMint = makeMint(
    'zoeEscrowReceipts',
    makeEscrowReceiptConfig,
  );
  const escrowReceiptIssuer = escrowReceiptMint.getIssuer();

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

      const userFacet = harden({
        // Escrow does the escrowing, but also updates the `purseQuantities`
        // (the current balance of the purses) and `quantities` (the amount
        // escrowed per player per issuer)
        escrow: async (offerDesc, payments) => {
          const result = makePromise();
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
              // if the user's contractual understanding includes
              // "haveAtLeast", make sure that they have supplied the
              // coordinating payment
              // TODO: test this with an example
              if (offerDesc[i].rule === 'haveAtLeast') {
                const amount = await purse.depositAll(payments[i]);
                insist(
                  state.strategies[i].includes(amount, offerDesc[i].amount),
                )`did not escrow enough to cover 'haveAtLeast'`;
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

          const escrowReceiptQuantity = harden({
            id: harden({}),
            offerMade: offerDesc,
          });
          const escrowReceiptPurse = escrowReceiptMint.mint(
            escrowReceiptQuantity,
          );
          const escrowReceiptPaymentP = escrowReceiptPurse.withdrawAll();

          const claimWinningsQuantity = harden({
            src: 'nothing', // TODO: fix this
            id: getNewIdObj(),
            offerMade: offerDesc,
          });
          const claimWinningsPurseP = seatMint.mint(claimWinningsQuantity);
          const seat = harden({
            getWinnings: () => result.p,
          });
          addUseObj(claimWinningsQuantity.id, seat);
          const claimWinningsPaymentP = claimWinningsPurseP.withdrawAll();

          return {
            escrowReceipt: escrowReceiptPaymentP,
            claimWinnings: claimWinningsPaymentP,
          };
        },
      });

      const middleLayerFacet = harden({
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
        getAssays: _ => state.assays,
        getQuantities: _ => state.quantities,
        getOffers: _ => state.offerDescs,
      });
      return { userFacet, middleLayerFacet };
    },
    getSeatIssuer: () => seatIssuer,
    getEscrowReceiptIssuer: () => escrowReceiptIssuer,
  });
};
export { makeZoe };
