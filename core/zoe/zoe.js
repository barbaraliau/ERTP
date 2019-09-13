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
  // The seatIssuer and escrowReceiptIssuer are long lived identities
  // over many contract installations
  const { getNewIdObj, seatMint, seatIssuer, addUseObj } = makeSeatMint();
  const escrowReceiptMint = makeMint(
    'zoeEscrowReceipts',
    makeEscrowReceiptConfig,
  );
  const escrowReceiptIssuer = escrowReceiptMint.getIssuer();

  return harden({
    makeInstance: (makeContract, issuers) => {
      const { adminState, readOnlyState } = makeState(issuers);

      function toAmountMatrix(assays, quantitiesMatrix) {
        const assayMakes = assays.map(assay => assay.make);
        return mapArrayOnMatrix(quantitiesMatrix, assayMakes);
      }

      function makePayments(amountsMatrix) {
        return amountsMatrix.map(row =>
          row.map((amount, i) => {
            const payment = adminState
              .getPurses()
              [i].withdraw(amount, 'payout');
            return payment;
          }),
        );
      }

      const userFacet = harden({
        // Escrow sets the `quantities` (the amount escrowed per
        // player per issuer)
        escrow: async (offerDesc, payments) => {
          const result = makePromise();
          const quantitiesForPlayerPromises = adminState
            .getPurses()
            .map(async (purse, i) => {
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
                  readOnlyState.strategies[i].includes(
                    amount,
                    offerDesc[i].amount,
                  ),
                )`did not escrow enough to cover 'haveAtLeast'`;
                return amount.quantity;
              }
              return readOnlyState.strategies[i].empty();
            });

          const quantitiesForPlayer = await Promise.all(
            quantitiesForPlayerPromises,
          );

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

          adminState.setQuantity(escrowReceiptQuantity.id, quantitiesForPlayer);
          adminState.setOffer(escrowReceiptQuantity.id, offerDesc);
          adminState.setResult(escrowReceiptQuantity.id, result);

          return {
            escrowReceipt: escrowReceiptPaymentP,
            claimWinnings: claimWinningsPaymentP,
          };
        },
        getIssuers: _ => readOnlyState.issuers,
      });

      const governingContractFacet = harden({
        // reallocation is a quantitiesMatrix
        // call this reallocation
        reallocate: (offerIds, reallocation) => {
          const offerDescs = readOnlyState.getOfferDescsFor(offerIds);
          const currentQuantities = readOnlyState.getQuantitiesFor(offerIds);
          insist(
            areRightsConserved(
              readOnlyState.strategies,
              currentQuantities,
              reallocation,
            ),
          )`Rights are not conserved in the proposed reallocation`;
          const amounts = toAmountMatrix(readOnlyState.assays, reallocation);
          insist(
            isOfferSafeForAll(readOnlyState.assays, offerDescs, amounts),
          )`The proposed reallocation was not offer safe`;
          // save the reallocation
          adminState.setQuantitiesFor(offerIds, reallocation);
        },
        eject: offerIds => {
          const quantities = readOnlyState.getQuantitiesFor(offerIds);
          const amounts = toAmountMatrix(readOnlyState.assays, quantities);
          const payments = makePayments(amounts);
          const results = adminState.getResultsFor(offerIds);
          results.map((result, i) => result.res(payments[i]));
          // delete offerIds after those offers have been allocated
          adminState.removeOffers(offerIds);
        },
        getIssuers: readOnlyState.getIssuers,
        getAssays: readOnlyState.getAssays,
        getQuantitiesFor: readOnlyState.getQuantitiesFor,
        getOfferDescsFor: readOnlyState.getOfferDescsFor,
        getSeatIssuer: () => seatIssuer,
        getEscrowReceiptIssuer: () => escrowReceiptIssuer,
      });

      const governingContract = makeContract(governingContractFacet);
      return harden({
        zoeInstance: userFacet,
        governingContract,
      });
    },
    getSeatIssuer: () => seatIssuer,
    getEscrowReceiptIssuer: () => escrowReceiptIssuer,
  });
};
export { makeZoe };
