import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeSeatConfigMaker } from '../../../../core/scooter/seatConfig';
import { makeMint } from '../../../../core/issuers';
import { offerEqual } from '../../../../core/scooter/utils';
import { insist } from '../../../../util/insist';

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

  const seatMint = makeMint('seats', makeSeatConfig);

  const purse1Quantity = harden([
    {
      src: 'swap',
      id: 1,
      offerToBeMade: [
        { rule: 'haveExactly', amount: assays[0].make(8) },
        { rule: 'wantExactly', amount: assays[1].make(6) },
      ],
    },
  ]);

  const purse1 = seatMint.mint(purse1Quantity);
  t.deepEqual(purse1.getBalance().quantity, purse1Quantity);

  const useObjListPurse1 = await purse1.unwrap();
  // purse1 should be empty at this point. Note that `withdrawAll` doesn't
  // destroy purses; it just empties the balance.
  t.deepEqual(purse1.getBalance().quantity, []);

  // no use objects are returned when called again. Should this throw?
  t.deepEqual(await purse1.unwrap(), []);

  t.equal(useObjListPurse1[0].makeOffer(purse1Quantity[0].offerToBeMade), true);

  const purse2Quantity = harden([
    {
      src: 'swap',
      id: 2,
      offerMade: [
        { rule: 'haveExactly', amount: assays[0].make(8) },
        { rule: 'wantExactly', amount: assays[1].make(6) },
      ],
    },
  ]);

  const purse2 = seatMint.mint(purse2Quantity);
  t.deepEqual(purse2.getBalance().quantity, purse2Quantity);

  const useObjListPurse2 = await purse2.unwrap();
  // purse1 should be empty at this point. Note that `withdrawAll` doesn't
  // destroy purses; it just empties the balance.
  t.deepEqual(purse2.getBalance().quantity, []);

  // no use objects are returned when called again. Should this throw?
  t.deepEqual(await purse2.unwrap(), []);

  t.deepEqual(useObjListPurse2[0].claim(), []);

  t.end();
});
