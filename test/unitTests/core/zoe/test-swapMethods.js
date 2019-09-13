import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { swapSrcs } from '../../../../core/zoe/contracts/swap/swapSrcs';
import { makeMint } from '../../../../core/issuers';

test('swap.areIssuersValid', t => {
  try {
    const { areIssuersValid } = swapSrcs;
    t.notOk(areIssuersValid([]));
    // we don't do much checking of whether the issuers are issuers
    // past whether the array is of length 2
    t.ok(areIssuersValid([1, 2]));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

const setupIsValidOfferTest = () => {
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simoleans');

  const moolaIssuer = moolaMint.getIssuer();
  const simoleanIssuer = simoleanMint.getIssuer();

  return harden({
    issuers: [moolaIssuer, simoleanIssuer],
  });
};

test('swap.isValidInitialOfferDesc', t => {
  const { isValidInitialOfferDesc } = swapSrcs;
  const { issuers } = setupIsValidOfferTest();
  const [moolaIssuer, simoleanIssuer] = issuers;
  t.test('first offer', st => {
    st.test('empty', sst => {
      try {
        sst.notOk(isValidInitialOfferDesc(issuers, []));
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
    st.test('undefined elements in array', sst => {
      try {
        t.throws(
          () => isValidInitialOfferDesc(issuers, [undefined, undefined]),
          `Cannot read property 'rule' of undefined`,
        );
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
    st.test('empty objects', sst => {
      try {
        t.notOk(isValidInitialOfferDesc(issuers, [{}, {}]));
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
    st.test('one correct, one empty', sst => {
      try {
        t.notOk(
          isValidInitialOfferDesc(issuers, [
            { haveExactly: moolaIssuer.makeAmount(3) },
            {},
          ]),
        );
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
    st.test('one wrong issuer, one wrong rule', sst => {
      try {
        t.notOk(
          isValidInitialOfferDesc(issuers, [
            { rule: 'haveExactly', amount: moolaIssuer.makeAmount(3) },
            { rule: 'haveExactly', amount: moolaIssuer.makeAmount(3) },
          ]),
        );
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
    st.test('amounts swapped', sst => {
      try {
        t.notOk(
          isValidInitialOfferDesc(issuers, [
            { rule: 'haveExactly', amount: simoleanIssuer.makeAmount(7) },
            { rule: 'wantExactly', amount: moolaIssuer.makeAmount(3) },
          ]),
        );
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
    st.test('correct rules and amounts', sst => {
      try {
        t.ok(
          isValidInitialOfferDesc(issuers, [
            { rule: 'haveExactly', amount: moolaIssuer.makeAmount(3) },
            { rule: 'wantExactly', amount: simoleanIssuer.makeAmount(7) },
          ]),
        );
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
    st.test('correct amounts, diff but correct rules', sst => {
      try {
        t.ok(
          isValidInitialOfferDesc(issuers, [
            { rule: 'wantExactly', amount: moolaIssuer.makeAmount(3) },
            { rule: 'haveExactly', amount: simoleanIssuer.makeAmount(7) },
          ]),
        );
      } catch (e) {
        sst.assert(false, e);
      } finally {
        sst.end();
      }
    });
  });
});
