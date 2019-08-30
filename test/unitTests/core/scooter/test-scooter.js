import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeScooter } from '../../../../core/scooter/scooter';
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
    scooter: makeScooter(),
  });
};

test('makeInstitution with trivial srcs', t => {
  try {
    const { scooter } = setup();
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
    t.ok(scooter.install(srcs));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test.only('makeInstitution with swap srcs', async t => {
  try {
    const { issuers, mints, scooter } = setup();

    const swap = scooter.install(swapSrcs);
    const seatIssuer = swap.getSeatIssuer();
    t.equals(swap.getIssuers(), undefined);
    const player1Offer = harden([
      {
        rule: 'haveExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);
    const player2Offer = harden([
      {
        rule: 'wantExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);
    const [player1InvitePayment, player2InvitePayment] = await swap.init(
      issuers,
      player1Offer,
    );
    t.deepEquals(swap.getIssuers(), issuers);
    t.deepEquals(player1InvitePayment.getBalance().quantity, [
      {
        src: 'swap',
        id: 0,
        offerToBeMade: player1Offer,
      },
    ]);
    t.deepEquals(player2InvitePayment.getBalance().quantity, [
      {
        src: 'swap',
        id: 1,
        offerToBeMade: player2Offer,
      },
    ]);

    const player1MoolaPurse = mints[0].mint(issuers[0].makeAmount(3));
    const player1MoolaPayment = player1MoolaPurse.withdrawAll();
    const player1SimoleanPurse = mints[1].mint(issuers[1].makeAmount(0));
    const player1SimoleanPayment = player1SimoleanPurse.withdrawAll();
    const player1Payments = [player1MoolaPayment, player1SimoleanPayment];
    const player1Invite = await player1InvitePayment.unwrap();

    const player2MoolaPurse = mints[0].mint(issuers[0].makeAmount(0));
    const player2MoolaPayment = player2MoolaPurse.withdrawAll();
    const player2SimoleanPurse = mints[1].mint(issuers[1].makeAmount(7));
    const player2SimoleanPayment = player2SimoleanPurse.withdrawAll();
    const player2Payments = [player2MoolaPayment, player2SimoleanPayment];
    const player2Invite = await player2InvitePayment.unwrap();

    const player1PositionPayment = await player1Invite[0].makeOffer(
      player1Offer,
      player1Payments,
    );
    const player2PositionPayment = await player2Invite[0].makeOffer(
      player2Offer,
      player2Payments,
    );

    const player1Position = await player1PositionPayment.unwrap();
    t.deepEquals(player1Position[0].refund(), []);

    const player2Position = await player2PositionPayment.unwrap();
    t.deepEquals(player2Position[0].refund(), []);

    const [player1Results, player2Results] = await Promise.all([
      player1Position[0].claim(),
      player2Position[0].claim(),
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
