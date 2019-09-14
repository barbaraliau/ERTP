import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import makePromise from '../../util/makePromise';
import { isOfferSafeForAll, areRightsConserved } from './utils/isOfferSafe';
import { mapArrayOnMatrix } from './utils/utils';

import { makeState } from './utils/state';
import { makeSeatMint } from './seatIssuer/seatMint';
import { makeEscrowReceiptConfig } from './escrowReceiptIssuer/escrowReceiptConfig';
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

      // an array of an empty quantity per issuer
      const makeEmptyQuantities = () =>
        readOnlyState.strategies.map(strategy => strategy.empty());

      const escrowEmpty = () => {
        const result = makePromise();
        const emptyOfferDescs = readOnlyState.assays.map(assay =>
          harden({
            rule: 'wantAtLeast',
            amount: assay.empty(),
          }),
        );
        const emptyOfferId = harden({});
        adminState.setQuantity(emptyOfferId, makeEmptyQuantities());
        adminState.setOffer(emptyOfferId, emptyOfferDescs);
        adminState.setResult(emptyOfferId, result);
        return emptyOfferId;
      };

      // This is used by governing contracts for accounting (for
      // instance, autoswap minting liquidity tokens to start), so no
      // need to give a seat.
      const escrowAndGetId = async (offerDesc, payments) => {
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

        const offerId = harden({});

        adminState.setQuantity(offerId, quantitiesForPlayer);
        adminState.setOffer(offerId, offerDesc);
        adminState.setResult(offerId, result);

        return harden({
          offerId,
          result,
        });
      };

      const userFacet = harden({
        escrow: async (offerDesc, payments) => {
          const { offerId, result } = await escrowAndGetId(offerDesc, payments);

          const escrowReceiptQuantity = harden({
            id: offerId,
            offerMade: offerDesc,
          });
          const escrowReceiptPurse = escrowReceiptMint.mint(
            escrowReceiptQuantity,
          );
          const escrowReceiptPaymentP = escrowReceiptPurse.withdrawAll();

          const claimWinningsQuantity = harden({
            src: 'nothing', // TODO: remove the src field
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
        getStrategies: readOnlyState.getStrategies,
        getQuantitiesFor: readOnlyState.getQuantitiesFor,
        getOfferDescsFor: readOnlyState.getOfferDescsFor,
        getSeatIssuer: () => seatIssuer,
        getEscrowReceiptIssuer: () => escrowReceiptIssuer,
        escrowEmpty,
        escrowAndGetId,
        makeEmptyQuantities,
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
