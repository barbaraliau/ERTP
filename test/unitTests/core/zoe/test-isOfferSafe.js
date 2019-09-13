import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import {
  isOfferSafeForPlayer,
  isOfferSafeForAll,
  areRightsConserved,
} from '../../../../core/zoe/utils/isOfferSafe';
import { makeMint } from '../../../../core/issuers';

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

// The player must have rules for each issuer
test('isOfferSafeForPlayer - empty rules', t => {
  try {
    const { assays } = setup();
    const rules = [];
    const amounts = [];

    t.throws(
      _ => isOfferSafeForPlayer(assays, rules, amounts),
      'assays, rules, and amounts must be arrays of the same length',
    );
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The player gets exactly what they wanted
test('isOfferSafeForPlayer - gets wantExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'wantExactly', amount: assays[0].make(8) },
      { rule: 'wantExactly', amount: assays[1].make(6) },
      { rule: 'wantExactly', amount: assays[2].make(7) },
    ];
    const amounts = [assays[0].make(8), assays[1].make(6), assays[2].make(7)];

    t.ok(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded exactly what they put in
test('isOfferSafeForPlayer - gets haveExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(1) },
      { rule: 'haveExactly', amount: assays[1].make(2) },
      { rule: 'haveExactly', amount: assays[2].make(3) },
    ];
    const amounts = [assays[0].make(1), assays[1].make(2), assays[2].make(3)];

    t.ok(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets a refund and winnings. This is offer safe.
test('isOfferSafeForPlayer - refund and winnings', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(2) },
      { rule: 'wantExactly', amount: assays[1].make(3) },
      { rule: 'wantExactly', amount: assays[2].make(3) },
    ];
    const amounts = [assays[0].make(2), assays[1].make(3), assays[2].make(3)];
    t.ok(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantExactly
test('isOfferSafeForPlayer - more than wantExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'wantExactly', amount: assays[0].make(2) },
      { rule: 'wantExactly', amount: assays[1].make(3) },
      { rule: 'wantExactly', amount: assays[2].make(4) },
    ];
    const amounts = [assays[0].make(5), assays[1].make(6), assays[2].make(8)];
    t.ok(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets more than they wanted - wantAtLeast
test('isOfferSafeForPlayer - more than wantAtLeast', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'wantAtLeast', amount: assays[0].make(2) },
      { rule: 'wantAtLeast', amount: assays[1].make(3) },
      { rule: 'wantAtLeast', amount: assays[2].make(4) },
    ];
    const amounts = [assays[0].make(5), assays[1].make(6), assays[2].make(8)];
    t.ok(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded more than what they put in
test('isOfferSafeForPlayer - more than haveExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(2) },
      { rule: 'haveExactly', amount: assays[1].make(3) },
      { rule: 'haveExactly', amount: assays[2].make(4) },
    ];
    const amounts = [assays[0].make(5), assays[1].make(6), assays[2].make(8)];
    t.ok(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantExactly
test('isOfferSafeForPlayer - less than wantExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(2) },
      { rule: 'wantExactly', amount: assays[1].make(3) },
      { rule: 'wantExactly', amount: assays[2].make(5) },
    ];
    const amounts = [assays[0].make(0), assays[1].make(2), assays[2].make(1)];
    t.notOk(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets less than what they wanted - wantAtLeast
test('isOfferSafeForPlayer - less than wantExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(2) },
      { rule: 'wantAtLeast', amount: assays[1].make(3) },
      { rule: 'wantAtLeast', amount: assays[2].make(9) },
    ];
    const amounts = [assays[0].make(0), assays[1].make(2), assays[2].make(1)];
    t.notOk(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// The user gets refunded less than they put in
test('isOfferSafeForPlayer - less than wantExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(2) },
      { rule: 'wantAtLeast', amount: assays[1].make(3) },
      { rule: 'wantAtLeast', amount: assays[2].make(3) },
    ];
    const amounts = [assays[0].make(1), assays[1].make(0), assays[2].make(0)];
    t.notOk(isOfferSafeForPlayer(assays, rules, amounts));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// All users get exactly what they wanted
test('isOfferSafeForAll - get wantExactly', t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(2) },
      { rule: 'wantExactly', amount: assays[1].make(3) },
      { rule: 'wantExactly', amount: assays[2].make(3) },
    ];

    const offerMatrix = [rules, rules, rules];
    const amounts = [assays[0].make(0), assays[1].make(3), assays[2].make(3)];
    const amountMatrix = [amounts, amounts, amounts];
    t.ok(isOfferSafeForAll(assays, offerMatrix, amountMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// One user doesn't get what they wanted
test(`isOfferSafeForAll - get wantExactly - one doesn't`, t => {
  try {
    const { assays } = setup();
    const rules = [
      { rule: 'haveExactly', amount: assays[0].make(2) },
      { rule: 'wantExactly', amount: assays[1].make(3) },
      { rule: 'wantExactly', amount: assays[2].make(3) },
    ];

    const offerMatrix = [rules, rules, rules];
    const amounts = [assays[0].make(0), assays[1].make(3), assays[2].make(3)];
    const unsatisfiedUserAmounts = [
      assays[0].make(0),
      assays[1].make(3),
      assays[2].make(2),
    ];
    const amountMatrix = [amounts, amounts, unsatisfiedUserAmounts];
    t.notOk(isOfferSafeForAll(assays, offerMatrix, amountMatrix));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// rights are conserved for Nat quantities
test(`areRightsConserved - true for nat quantities`, t => {
  try {
    const { issuers } = setup();
    const strategies = issuers.map(issuer => issuer.getStrategy());
    const oldQuantities = [[0, 1, 0], [4, 1, 0], [6, 3, 0]];
    const newQuantities = [[1, 2, 0], [3, 1, 0], [6, 2, 0]];

    t.ok(areRightsConserved(strategies, oldQuantities, newQuantities));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

// rights are *not* conserved for Nat quantities
test(`areRightsConserved - false for nat quantities`, t => {
  try {
    const { issuers } = setup();
    const strategies = issuers.map(issuer => issuer.getStrategy());
    const oldQuantities = [[0, 1, 4], [4, 1, 0], [6, 3, 0]];
    const newQuantities = [[1, 2, 0], [3, 1, 0], [6, 2, 0]];

    t.notOk(areRightsConserved(strategies, oldQuantities, newQuantities));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});