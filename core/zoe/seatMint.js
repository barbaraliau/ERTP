import harden from '@agoric/harden';

import { makeSeatConfigMaker } from './seatConfig';
import { makeMint } from '../issuers';

const makeSeatMint = () => {
  // TODO: Make a weakmap so unused ones can be garbage collected
  // ids are a communication channel
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

  // I'm not happy with this ducktyping but the alternative is having
  // two methods that have mostly duplicate code
  const burnAndMakeUseObj = async (issuer, asset) => {
    const { quantity } = asset.getBalance();
    const useObj = makeUseObj(quantity);

    // if it's a purse, we need to withdraw
    if (Object.prototype.hasOwnProperty.call(asset, 'withdrawAll')) {
      const payment = asset.withdrawAll();
      await issuer.burnAll(payment);
    } else {
      // it's a payment, we can go forward with burning it
      await issuer.burnAll(asset);
    }
    return useObj;
  };

  const makeSeatConfig = makeSeatConfigMaker(burnAndMakeUseObj);

  const seatMint = makeMint('zoeSeats', makeSeatConfig);
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
