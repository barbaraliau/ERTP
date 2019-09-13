import harden from '@agoric/harden';

const makeAutomaticRefund = zoeInstance => {
  return harden({
    async makeOffer(escrowReceipt) {
      // we will either drop this purse or withdraw from it to give a
      // refund
      const escrowReceiptIssuer = zoeInstance.getEscrowReceiptIssuer();
      const escrowReceiptPurse = escrowReceiptIssuer.makeEmptyPurse();
      const amount = await escrowReceiptPurse.depositAll(escrowReceipt);
      const { id, offerMade } = amount.quantity;
      const offerIds = harden([id]);
      const quantities = zoeInstance.getQuantitiesFor(offerIds);
      zoeInstance.allocate(offerIds, quantities);
      return offerMade;
    },
  });
};
export { makeAutomaticRefund };
