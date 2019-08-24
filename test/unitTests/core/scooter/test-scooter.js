import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeInstitution } from '../../../../core/scooter/scooter';
import { swapSrcs } from '../../../../core/scooter/contracts/swap';
import { makeMint } from '../../../../core/issuers';

const setup = () => {
  const moolaMint = makeMint('moola');
  const simoleanMint = makeMint('simoleans');

  const moolaIssuer = moolaMint.getIssuer();
  const simoleanIssuer = simoleanMint.getIssuer();

  const moolaAssay = moolaIssuer.getAssay();
  const simoleanAssay = simoleanIssuer.getAssay();

  return harden({
    mints: [moolaMint, simoleanMint],
    issuers: [moolaIssuer, simoleanIssuer],
    assays: [moolaAssay, simoleanAssay],
  });
};

test('makeInstitution with trivial srcs', t => {
  try {
    const srcs = {
      startState: 'empty',
      allowedTransitions: [
        ['empty', ['open']],
        ['open', ['reallocating', 'cancelled']],
        ['reallocating', ['dispersing']],
        ['dispersing', ['closed']],
        ['cancelled', []],
        ['closed', []],
      ],
      areIssuersValid: _issuers => true,
      isValidOffer: (_issuers, _offersSoFar, _newOffer, _data) => true,
      canReallocate: _offers => true,
      reallocate: allocations => allocations,
      cancel: allocations => allocations,
    };
    t.ok(makeInstitution(srcs));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test.skip('makeInstitution with swap srcs', t => {
  try {
    const { issuers, mints } = setup();

    const swap = makeInstitution(swapSrcs);
    t.equals(swap.getIssuers(), undefined);
    swap.init(issuers);
    t.deepEquals(swap.getIssuers(), issuers);
    const myOffer = [
      {
        rule: 'haveExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
    ];
    const moolaPurse = mints[0].mint(issuers[0].makeAmount(3));
    const moolaPayment = moolaPurse.withdrawAll();
    const simoleanPurse = mints[1].mint(issuers[1].makeAmount(0));
    const simoleanPayment = simoleanPurse.withdrawAll();
    const myPayments = [moolaPayment, simoleanPayment];
    const results = swap.makeOffer(myOffer, myPayments);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
