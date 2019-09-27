import harden from '@agoric/harden';

import makePromise from '../../../util/makePromise';
import { mapArrayOnMatrix } from '../contractUtils';

// These utilities are used within Zoe itself. Importantly, there is
// no ambient authority for these utilities. Any authority must be
// passed in, making it easy to see which functions can affect what.

const mintEscrowReceiptPayment = (escrowReceiptMint, offerId, offerDesc) => {
  const escrowReceiptQuantity = harden({
    id: offerId,
    offerMade: offerDesc,
  });
  const escrowReceiptPurse = escrowReceiptMint.mint(escrowReceiptQuantity);
  const escrowReceiptPaymentP = escrowReceiptPurse.withdrawAll();
  return escrowReceiptPaymentP;
};

const mintClaimPayoffPayment = (seatMint, addUseObj, offerDesc, result) => {
  const claimPayoffQuantity = harden({
    id: harden({}),
    offerMade: offerDesc,
  });
  const claimPayoffPurseP = seatMint.mint(claimPayoffQuantity);
  const seat = harden({
    getPayoff: () => result.p,
  });
  addUseObj(claimPayoffQuantity.id, seat);
  const claimPayoffPaymentP = claimPayoffPurseP.withdrawAll();
  return claimPayoffPaymentP;
};

const escrowAllPayments = async (
  purses,
  strategies,
  offerDesc,
  offerPayments,
) => {
  const quantitiesArrayPromises = purses.map(async (purse, i) => {
    // if the user's contractual understanding includes
    // "offerExactly" or "offerAtMost", make sure that they have supplied a
    // payment with that exact balance
    if (['offerExactly', 'offerAtMost'].includes(offerDesc[i].rule)) {
      const amount = await purse.depositExactly(
        offerDesc[i].amount,
        offerPayments[i],
      );
      return amount.quantity;
    }
    return strategies[i].empty();
  });
  const quantitiesArray = Promise.all(quantitiesArrayPromises);
  return quantitiesArray;
};

const recordOffer = (adminState, offerDesc, quantitiesArray) => {
  const result = makePromise();
  const offerId = harden({});

  // has side effects
  adminState.recordOffer(offerId, offerDesc, quantitiesArray, result);

  return harden({
    offerId,
    result,
  });
};

const escrowOffer = async (
  adminState,
  strategies,
  offerDesc,
  offerPayments,
) => {
  const quantitiesArray = await escrowAllPayments(
    adminState.getPurses(),
    strategies,
    offerDesc,
    offerPayments,
  );

  return recordOffer(adminState, offerDesc, quantitiesArray);
};

const escrowEmptyOffer = (adminState, assays, strategies) => {
  const quantitiesArray = strategies.map(strategy => strategy.empty());

  const offerDesc = assays.map(assay =>
    harden({
      rule: 'wantAtLeast',
      amount: assay.empty(),
    }),
  );
  return recordOffer(adminState, offerDesc, quantitiesArray);
};

const makePayments = (purses, amountsMatrix) =>
  amountsMatrix.map(row =>
    row.map((amount, i) => {
      const payment = purses[i].withdraw(amount, 'payout');
      return payment;
    }),
  );

// Transform a quantitiesMatrix to a matrix of amounts given an array
// of the associated assays.
const toAmountMatrix = (assays, quantitiesMatrix) => {
  const assayMakes = assays.map(assay => assay.make);
  return mapArrayOnMatrix(quantitiesMatrix, assayMakes);
};

const burnAll = async (purses, issuers, assays, burnQuantities) => {
  const burnMatrix = harden([burnQuantities]);
  const amountsMatrix = toAmountMatrix(assays, burnMatrix);
  const payments = makePayments(purses, amountsMatrix);
  const burnedAmountsP = issuers.map((issuer, i) =>
    issuer.burnAll(payments[0][i]),
  );
  return Promise.all(burnedAmountsP);
};

export {
  makePayments,
  escrowEmptyOffer,
  escrowOffer,
  mintEscrowReceiptPayment,
  mintClaimPayoffPayment,
  burnAll,
  toAmountMatrix,
};