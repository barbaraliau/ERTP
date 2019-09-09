import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeSeatConfigMaker } from '../../../../core/zoe/seatConfig';
import { makeMint } from '../../../../core/issuers';
import { offerEqual } from '../../../../core/zoe/utils';
import { insist } from '../../../../util/insist';

// quantity = {
//   src: 'swap',
//   id: 1,
//   offerToBeMade: [rule1, rule2],
// }

// quantity = {
//   src: 'swap',
//   id: 1,
//   offerMade: [rule1, rule2],
// }

const setup = () => {
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simoleans');
  const bucksMint = makeMint('bucks');

  const moolaIssuer = moolaMint.getIssuer();
  const simoleanIssuer = simoleanMint.getIssuer();
  const bucksIssuer = bucksMint.getIssuer();

  const moolaAssay = moolaIssuer.getAssay();
  const simoleanAssay = simoleanIssuer.getAssay();
  const bucksAssay = bucksIssuer.getAssay();

  return harden({
    mints: [moolaMint, simoleanMint, bucksMint],
    issuers: [moolaIssuer, simoleanIssuer, bucksIssuer],
    assays: [moolaAssay, simoleanAssay, bucksAssay],
  });
};

test('seatMint', async t => {
  const { assays } = setup();

  const makeUseObj = quantity => {
    insist(quantity !== null)`the asset is empty or already used`;
    if (quantity.offerToBeMade) {
      return harden({
        makeOffer: offer => {
          insist(offerEqual(assays, offer, quantity.offerToBeMade));
          // do things with the offer
          return true;
        },
      });
    }
    if (quantity.offerMade) {
      return harden({
        claim: () => {
          return [];
        },
      });
    }
    return harden({});
  };

  // I'm not happy with this ducktyping but the alternative is having
  // two methods that have duplicate code
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

  const seatMint = makeMint('seats', makeSeatConfig);

  const purse1Quantity = harden({
    src: 'swap',
    id: 1,
    offerToBeMade: [
      { rule: 'haveExactly', amount: assays[0].make(8) },
      { rule: 'wantExactly', amount: assays[1].make(6) },
    ],
  });

  const purse1 = seatMint.mint(purse1Quantity);
  t.deepEqual(purse1.getBalance().quantity, purse1Quantity);

  const useObjPurse1 = await purse1.unwrap();
  // purse1 should be empty at this point. Note that `withdrawAll` doesn't
  // destroy purses; it just empties the balance.
  t.deepEqual(purse1.getBalance().quantity, null);

  t.rejects(purse1.unwrap(), /the asset is empty or already used/);

  t.equal(useObjPurse1.makeOffer(purse1Quantity.offerToBeMade), true);

  const purse2Quantity = harden({
    src: 'swap',
    id: 2,
    offerMade: [
      { rule: 'haveExactly', amount: assays[0].make(8) },
      { rule: 'wantExactly', amount: assays[1].make(6) },
    ],
  });

  const purse2 = seatMint.mint(purse2Quantity);
  t.deepEqual(purse2.getBalance().quantity, purse2Quantity);

  const useObjPurse2 = await purse2.unwrap();
  // purse1 should be empty at this point. Note that `withdrawAll` doesn't
  // destroy purses; it just empties the balance.
  t.deepEqual(purse2.getBalance().quantity, null);

  t.rejects(purse2.unwrap(), /the asset is empty or already used/);

  t.deepEqual(useObjPurse2.claim(), []);

  t.end();
});
