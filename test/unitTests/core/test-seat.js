import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeSeatMint } from '../../../core/seatMint';
import { makeMint } from '../../../core/issuers';
import { insist } from '../../../util/insist';

/*
 * A seat quantity may look like:
 *
 * {
 *   id: {},
 *   offerToBeMade: [rule1, rule2],
 * }
 *
 * or:
 *
 * {
 *   id: {},
 *   offerMade: [rule1, rule2],
 * }
 *
 */

const allTrue = (prev, curr) => prev && curr;

const ruleEqual = (leftRule, rightRule) => leftRule.rule === rightRule.rule;

const amountEqual = (assay, leftRule, rightRule) =>
  assay.equals(leftRule.amount, rightRule.amount);

const offerEqual = (assays, leftOffer, rightOffer) => {
  const isLengthEqual = leftOffer.length === rightOffer.length;
  if (!isLengthEqual) {
    return false;
  }
  return leftOffer
    .map((leftRule, i) => {
      return (
        ruleEqual(leftRule, rightOffer[i]) &&
        amountEqual(assays[i], leftRule, rightOffer[i])
      );
    })
    .reduce(allTrue);
};

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
  const { seatMint, addUseObj } = makeSeatMint();

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

  const purse1Quantity = harden({
    id: harden({}),
    offerToBeMade: [
      { rule: 'haveExactly', amount: assays[0].make(8) },
      { rule: 'wantExactly', amount: assays[1].make(6) },
    ],
  });

  const purse1 = seatMint.mint(purse1Quantity);
  t.deepEqual(purse1.getBalance().quantity, purse1Quantity);
  addUseObj(purse1Quantity.id, makeUseObj(purse1Quantity));

  const useObjPurse1 = await purse1.unwrap();
  // purse1 should be empty at this point. Note that `withdrawAll` doesn't
  // destroy purses; it just empties the balance.
  t.deepEqual(purse1.getBalance().quantity, null);

  t.rejects(purse1.unwrap(), /the purse is empty or already used/);

  t.equal(useObjPurse1.makeOffer(purse1Quantity.offerToBeMade), true);

  const purse2Quantity = harden({
    id: harden({}),
    offerMade: [
      { rule: 'haveExactly', amount: assays[0].make(8) },
      { rule: 'wantExactly', amount: assays[1].make(6) },
    ],
  });

  const purse2 = seatMint.mint(purse2Quantity);
  t.deepEqual(purse2.getBalance().quantity, purse2Quantity);
  addUseObj(purse2Quantity.id, makeUseObj(purse2Quantity));

  const useObjPurse2 = await purse2.unwrap();
  // purse1 should be empty at this point. Note that `withdrawAll` doesn't
  // destroy purses; it just empties the balance.
  t.deepEqual(purse2.getBalance().quantity, null);

  t.rejects(purse2.unwrap(), /the purse is empty or already used/);

  t.deepEqual(useObjPurse2.claim(), []);

  t.end();
});
