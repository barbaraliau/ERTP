import harden from '@agoric/harden';

import { makeSeatConfigMaker } from './seatConfig';
import { makeMint } from '../issuers';

const makeSeatMint = () => {
  const idsToSeats = new Map();
  let nextSeatId = 0;

  const getNextSeatId = () => {
    const id = nextSeatId;
    nextSeatId += 1;
    return id;
  };

  const addUseObj = (id, useObj) => {
    idsToSeats.set(id, useObj);
  };

  const makeUseObj = seatQuantity => {
    return harden(idsToSeats.get(seatQuantity.id));
  };

  const makeUseObjListForPayment = async (issuer, payment) => {
    const { quantity } = payment.getBalance();
    const useObjs = quantity.map(makeUseObj);
    await issuer.burnAll(payment);
    return useObjs;
  };

  const makeUseObjListForPurse = async (issuer, purse) => {
    const ids = purse.getBalance().quantity;
    const useObjs = ids.map(makeUseObj);
    const paymentP = purse.withdrawAll();
    await issuer.burnAll(paymentP);
    return useObjs;
  };

  const makeSeatConfig = makeSeatConfigMaker(
    makeUseObjListForPayment,
    makeUseObjListForPurse,
  );

  const seatMint = makeMint('scooterSeats', makeSeatConfig);
  const seatIssuer = seatMint.getIssuer();

  return {
    getNextSeatId,
    seatMint,
    seatIssuer,
    addUseObj,
  };
};

harden(makeSeatMint);

export { makeSeatMint };
