import harden from '@agoric/harden';

const makeSimpleSwap = zoeInstance => {
  const escrowReceiptIssuer = zoeInstance.getEscrowReceiptIssuer();

  const reallocate = quantities => harden([quantities[1], quantities[0]]);

  // There is no checking of whether an offer matches here, other than
  // offer enforcement at the zoe layer
  return harden({
    async makeOffer(escrowReceipt) {
      const escrowReceiptPurse = escrowReceiptIssuer.makeEmptyPurse();
      const amount = await escrowReceiptPurse.depositAll(escrowReceipt);
      const { offerMade } = amount.quantity;
      if (zoeInstance.getQuantities().length === 2) {
        zoeInstance.allocate(reallocate(zoeInstance.getQuantities()));
      }
      return offerMade;
    },
  });
};
export { makeSimpleSwap };
