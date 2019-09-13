import harden from '@agoric/harden';
import { passStyleOf } from '@agoric/marshal';

import { insist } from '../../../util/insist';
import { makeUniStrategy } from '../../config/strategies/uniStrategy';

// quantity = {
//   src: 'swap',
//   id: 1,
//   offerToBeMade: [rule1, rule2],
// }

// quantity = {
//   src: 'swap',
//   id: 2,
//   offerMade: [rule1, rule2],
// }

const isContractName = str => {
  insist(typeof str === 'string');
  // TODO: lookup name in the contract import map
  return true;
};

// TODO: more robust checks
const insistSeat = seat => {
  if (seat === null) {
    return null;
  }
  const properties = Object.getOwnPropertyNames(seat);
  insist(
    properties.length === 3,
  )`must have the properties 'src', 'id', and 'offerToBeMade' or 'offerMade'`;
  insist(properties.includes('src'))`must include 'src'`;
  insist(properties.includes('id'))`must include 'id'`;
  insist(
    properties.includes('offerToBeMade') || properties.includes('offerMade'),
  )`must include 'offerToBeMade' or 'offerMade'`;
  insist(isContractName(seat.src))`'src' is not a contract name`;
  insist(
    passStyleOf(seat.id) === 'presence' &&
      Object.entries(seat.id).length === 0 &&
      seat.id.constructor === Object,
  )`id should be an empty object`;
  insist(
    passStyleOf(seat.offerToBeMade) === 'copyArray' ||
      passStyleOf(seat.offerMade) === 'copyArray',
  )`an offer should be an array`;
  return seat;
};

const extractIds = seats => seats.map(seat => seat.id);

const seatStrategy = makeUniStrategy(insistSeat);

harden(seatStrategy);

export { seatStrategy, extractIds, insistSeat, isContractName };
