import harden from '@agoric/harden';

const makeAutomaticRefund = zoeInstance => {
  const escrowReceiptIssuer = zoeInstance.getEscrowReceiptIssuer();

  const institution = harden({
    async makeOffer(escrowReceipt) {
      // we will either drop this purse or withdraw from it to give a refund
      const escrowReceiptPurse = escrowReceiptIssuer.makeEmptyPurse();
      const amount = await escrowReceiptPurse.depositAll(escrowReceipt);
      const { offerMade } = amount.quantity;
      zoeInstance.allocate(zoeInstance.getQuantities());
      return offerMade;
    },
    getIssuers: _ => zoeInstance.getIssuers(),
  });
  return institution;
};
export { makeAutomaticRefund };
