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

test.only('makeInstitution with swap srcs', async t => {
  try {
    const { issuers, mints } = setup();

    const swap = makeInstitution(swapSrcs);
    t.equals(swap.getIssuers(), undefined);
    swap.init(issuers);
    t.deepEquals(swap.getIssuers(), issuers);
    const player1Offer = [
      {
        rule: 'haveExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
    ];
    const player1MoolaPurse = mints[0].mint(issuers[0].makeAmount(3));
    const player1MoolaPayment = player1MoolaPurse.withdrawAll();
    const player1SimoleanPurse = mints[1].mint(issuers[1].makeAmount(0));
    const player1SimoleanPayment = player1SimoleanPurse.withdrawAll();
    const player1Payments = [player1MoolaPayment, player1SimoleanPayment];
    const player1ResultsP = swap.makeOffer(player1Offer, player1Payments);

    const player2Offer = [
      {
        rule: 'wantExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(7),
      },
    ];
    const player2MoolaPurse = mints[0].mint(issuers[0].makeAmount(0));
    const player2MoolaPayment = player2MoolaPurse.withdrawAll();
    const player2SimoleanPurse = mints[1].mint(issuers[1].makeAmount(7));
    const player2SimoleanPayment = player2SimoleanPurse.withdrawAll();
    const player2Payments = [player2MoolaPayment, player2SimoleanPayment];
    const player2ResultsP = swap.makeOffer(player2Offer, player2Payments);

    const [player1Results, player2Results] = await Promise.all([
      player1ResultsP,
      player2ResultsP,
    ]);

    t.equals(player1Results[0].getBalance().quantity, 0);
    t.deepEquals(player1Results[1].getBalance(), player1Offer[1].amount);

    await player1MoolaPurse.depositAll(player1Results[0]);
    await player1SimoleanPurse.depositAll(player1Results[1]);

    await player2MoolaPurse.depositAll(player2Results[0]);
    await player2SimoleanPurse.depositAll(player2Results[1]);

    // player1 had 3 moola and 0 simoleans.
    // player 2 had 0 moola and 7 simoleans.

    // Now, player1 should have 0 moola and 7 simoleans.
    // player 2 should have 3 moola and 0 simoleans.

    t.equals(player1MoolaPurse.getBalance().quantity, 0);
    t.equals(player1SimoleanPurse.getBalance().quantity, 7);
    t.equals(player2MoolaPurse.getBalance().quantity, 3);
    t.equals(player2SimoleanPurse.getBalance().quantity, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
