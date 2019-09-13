import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { insist } from '../../../util/insist';
import { makeUniStrategy } from '../../config/strategies/uniStrategy';

// quantity = {
//   id: 2,
//   offerMade: [rule1, rule2],
// }

// TODO: more robust checks
const insistEscrowReceipt = escrowReceipt => {
  if (escrowReceipt === null) {
    return null;
  }
  const properties = Object.getOwnPropertyNames(escrowReceipt);
  insist(
    properties.length === 2,
  )`must have the properties 'id', and 'offerMade'`;
  insist(properties.includes('id'))`must include 'id'`;
  insist(properties.includes('offerMade'))`must include 'offerMade'`;
  insist(
    passStyleOf(escrowReceipt.id) === 'presence' &&
      Object.entries(escrowReceipt.id).length === 0 &&
      escrowReceipt.id.constructor === Object,
  )`id should be an empty object`;
  insist(
    passStyleOf(escrowReceipt.offerMade) === 'copyArray',
  )`an offer should be an array`;
  return escrowReceipt;
};

const escrowReceiptStrategy = makeUniStrategy(insistEscrowReceipt);

harden(escrowReceiptStrategy);

export { escrowReceiptStrategy, insistEscrowReceipt };
