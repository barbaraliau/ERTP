import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { passStyleOf } from '@agoric/marshal';

import { insist } from '../../util/insist';
import { makeListStrategy } from '../config/strategies/listStrategy';

// quantity = [{
//   src: 'swap',
//   id: 1,
//   offerToBeMade: [rule1, rule2],
// }]

// quantity = [{
//   src: 'swap',
//   id: 1,
//   offerMade: [rule1, rule2],
// }]

const isContractName = str => {
  insist(typeof str === 'string');
  // TODO: lookup name in the contract import map
};

// TODO: more robust checks
const insistSeat = seat => {
  const properties = Object.getOwnPropertyNames(seat);
  insist(
    properties.length === 3,
  )`must have the properties 'src', 'id', and 'offerToBeMade' or 'offerMade'`;
  insist(isContractName(seat.src));
  Nat(seat.id);
  insist(
    passStyleOf(seat.offerToBeMade) === 'copyArray' ||
      passStyleOf(seat.offerMade) === 'copyArray',
  );
};

const extractIds = seats => seats.map(seat => seat.id);

const isEqual = (left, right) => left.id === right.id;

const compare = (a, b) => {
  if (!a || !b) {
    return undefined;
  }

  if (a.id === b.id) {
    return 0;
  }

  if (a.id < b.id) {
    return -1;
  }

  // must be greater
  return 1;
};

const seatStrategy = makeListStrategy(insistSeat, isEqual, compare);

harden(seatStrategy);

export {
  seatStrategy,
  extractIds,
  compare,
  isEqual,
  insistSeat,
  isContractName,
};
