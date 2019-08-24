import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { swapSrcs } from '../../../../core/scooter/contracts/swap';
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

// isValidOffer(issuers, offersSoFar, newOffer, _data)
// we can assume that the only parameter passed by the user is
// newOffer. All others assumed to be well-formed by scooter

const runIsValidOfferTests = offersSoFar => {
  const setupIsValidOfferTest = () => {
    const moolaMint = makeMint('moola');
    const simoleanMint = makeMint('simoleans');

    const moolaIssuer = moolaMint.getIssuer();
    const simoleanIssuer = simoleanMint.getIssuer();

    return harden({
      issuers: [moolaIssuer, simoleanIssuer],
      data: undefined,
    });
  };
  test('swap.isValidOffer', t => {
    const { isValidOffer } = swapSrcs;
    const { issuers, data } = setupIsValidOfferTest();
    const [moolaIssuer, simoleanIssuer] = issuers;
    t.test('first offer', st => {
      st.test('empty', sst => {
        try {
          sst.notOk(isValidOffer(issuers, offersSoFar, [], data));
        } catch (e) {
          sst.assert(false, e);
        } finally {
          sst.end();
        }
      });
      st.test('undefined elements in array', sst => {
        try {
          t.throws(
            () =>
              isValidOffer(issuers, offersSoFar, [undefined, undefined], data),
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
          t.notOk(isValidOffer(issuers, offersSoFar, [{}, {}], data));
        } catch (e) {
          sst.assert(false, e);
        } finally {
          sst.end();
        }
      });
      st.test('one correct, one empty', sst => {
        try {
          t.notOk(
            isValidOffer(
              issuers,
              offersSoFar,
              [{ haveExactly: moolaIssuer.makeAmount(3) }, {}],
              data,
            ),
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
            isValidOffer(
              issuers,
              offersSoFar,
              [
                { rule: 'haveExactly', amount: moolaIssuer.makeAmount(3) },
                { rule: 'haveExactly', amount: moolaIssuer.makeAmount(3) },
              ],
              data,
            ),
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
            isValidOffer(
              issuers,
              offersSoFar,
              [
                { rule: 'haveExactly', amount: simoleanIssuer.makeAmount(7) },
                { rule: 'wantExactly', amount: moolaIssuer.makeAmount(3) },
              ],
              data,
            ),
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
            isValidOffer(
              issuers,
              offersSoFar,
              [
                { rule: 'haveExactly', amount: moolaIssuer.makeAmount(3) },
                { rule: 'wantExactly', amount: simoleanIssuer.makeAmount(7) },
              ],
              data,
            ),
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
            isValidOffer(
              issuers,
              offersSoFar,
              [
                { rule: 'wantExactly', amount: moolaIssuer.makeAmount(3) },
                { rule: 'haveExactly', amount: simoleanIssuer.makeAmount(7) },
              ],
              data,
            ),
          );
        } catch (e) {
          sst.assert(false, e);
        } finally {
          sst.end();
        }
      });
    });
  });
};

// no offers so far
runIsValidOfferTests([]);

// one offer so far
// runIsValidOfferTests([
//   { rule: 'haveExactly', amount: moolaIssuer.makeAmount(3) },
//   { rule: 'wantExactly', amount: simoleanIssuer.makeAmount(7) },
// ]);


// test('swap.isValidOffer - one offer so far additional tests', t => {
//   const { isValidOffer } = swapSrcs;
//   const { issuers, data } = setupIsValidOfferTest();
//   const [moolaIssuer, simoleanIssuer] = issuers;
//   t.test('second offer', st => {
//     st.test('valid if was first, but now mismatch', sst => {
//       try {
//         t.ok(
//           isValidOffer(
//             issuers,
//             offersSoFar,
//             [
//               { rule: 'wantExactly', amount: moolaIssuer.makeAmount(3) },
//               { rule: 'haveExactly', amount: simoleanIssuer.makeAmount(7) },
//             ],
//             data,
//           ),
//         );
//       } catch (e) {
//         sst.assert(false, e);
//       } finally {
//         sst.end();
//       }
//     });
//   });
// });
