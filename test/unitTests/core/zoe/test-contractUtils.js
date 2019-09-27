import { test } from 'tape-promise/tape';

import {
  bothTrue,
  eitherTrue,
  transpose,
  mapArrayOnMatrix,
  offerEqual,
  makeEmptyQuantities,
  vectorWith,
  makeAmount,
  makeOfferDesc,
} from '../../../../core/zoe/contractUtils';
import { setup } from './setupBasicMints';

test('bothTrue', t => {
  try {
    t.ok([1, 2].reduce(bothTrue));
    t.notOk([false, 2].reduce(bothTrue));
    t.notOk([false, false].reduce(bothTrue));
    t.ok([true, true].reduce(bothTrue));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('eitherTrue', t => {
  try {
    t.ok([1, 2].reduce(eitherTrue));
    t.ok([false, 2].reduce(eitherTrue));
    t.notOk([false, false].reduce(eitherTrue));
    t.ok([true, true].reduce(eitherTrue));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('transpose', t => {
  try {
    t.deepEquals(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mapArrayOnMatrix', t => {
  try {
    const matrix = [[1, 2, 3], [4, 5, 6]];
    const add2 = x => x + 2;
    const subtract4 = x => x - 4;
    const mult5 = x => x * 5;
    const arrayF = [add2, subtract4, mult5];
    t.deepEquals(mapArrayOnMatrix(matrix, arrayF), [[3, -2, 15], [6, 1, 30]]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('makeEmptyQuantities', t => {
  try {
    const { issuers } = setup();
    const strategies = issuers.map(issuer => issuer.getStrategy());
    t.deepEquals(makeEmptyQuantities(strategies), [0, 0, 0]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - offers are equal', t => {
  const { issuers, strategies } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    t.ok(offerEqual(strategies, offer1, offer1));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - throws bc offers have different issuers', t => {
  const { issuers, strategies } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        amount: issuers[1].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[0].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    t.notOk(offerEqual(strategies, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - returns false bc different quantity', t => {
  const { issuers, strategies } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(4),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    t.notOk(offerEqual(strategies, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - returns false bc different rule', t => {
  const { issuers, strategies } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'offerExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    t.notOk(offerEqual(strategies, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('offerEqual - wantExactly vs wantAtLeast - returns false', t => {
  const { issuers, strategies } = setup();
  try {
    const offer1 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantExactly',
        amount: issuers[2].makeAmount(7),
      },
    ];
    const offer2 = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
      {
        rule: 'wantAtLeast',
        amount: issuers[2].makeAmount(7),
      },
    ];
    t.notOk(offerEqual(strategies, offer1, offer2));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('vectorWith', t => {
  try {
    const { strategies } = setup();
    const leftQuantities = [4, 5, 6];
    const rightQuantities = [3, 5, 10];
    t.deepEquals(vectorWith(strategies, leftQuantities, rightQuantities), [
      7,
      10,
      16,
    ]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('makeAmount', t => {
  try {
    const { strategies, labels, issuers, mints } = setup();
    const amount = makeAmount(strategies[0], labels[0], 10);
    t.deepEquals(amount, issuers[0].makeAmount(10));
    const purse = mints[0].mint(amount);
    t.deepEquals(purse.getBalance(), amount);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('makeOfferDesc', t => {
  try {
    const { strategies, labels, issuers } = setup();
    const rules = ['offerExactly', 'offerAtMost', 'wantAtLeast'];
    const quantities = [4, 6, 2];
    const actualOfferDesc = makeOfferDesc(
      strategies,
      labels,
      rules,
      quantities,
    );

    const expectedOfferDesc = [
      {
        rule: 'offerExactly',
        amount: issuers[0].makeAmount(4),
      },
      {
        rule: 'offerAtMost',
        amount: issuers[1].makeAmount(6),
      },
      {
        rule: 'wantAtLeast',
        amount: issuers[2].makeAmount(2),
      },
    ];
    t.deepEquals(actualOfferDesc, expectedOfferDesc);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});