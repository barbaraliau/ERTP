import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../core/zoe/zoe';
import { swapSrcs } from '../../../../core/zoe/contracts/swap';
import { makeMint } from '../../../../core/issuers';
import { offerEqual } from '../../../../core/zoe/utils';

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
    zoe: makeZoe(),
  });
};

test('zoe.install with trivial srcs', t => {
  try {
    // Zoe should be long-lived.
    const { zoe } = setup();
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
    t.ok(zoe.install(srcs));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('zoe.install(swapSrcs) with valid offers', async t => {
  try {
    const { issuers, mints, zoe, assays } = setup();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(issuers[0].makeAmount(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(issuers[1].makeAmount(0));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(issuers[0].makeAmount(0));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();
    const bobSimoleanPurse = mints[1].mint(issuers[1].makeAmount(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a swap instance
    const swap = zoe.install(swapSrcs);

    // The issuers are undefined at this step
    t.equals(swap.getIssuers(), undefined);

    // 2: Alice initializes the swap with issuers and an initial offer
    const aliceOffer = harden([
      {
        rule: 'haveExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment];

    // Alice gets two kinds of things back - invites (the ability to
    // make an offer) and a seat for herself (the right to claim after
    // an offer has been made). She gets a seat since she made an
    // offer. Bob gets an invite.
    const { seat: aliceSeatPaymentP, invites } = await swap.init(
      issuers,
      aliceOffer,
      alicePayments,
    );
    const [bobInvitePayment] = invites;

    // Check that the issuers and bobInvitePayment are as expected
    t.deepEquals(swap.getIssuers(), issuers);
    t.deepEquals(bobInvitePayment.getBalance().quantity, {
      src: 'swap',
      id: 0,
      offerToBeMade: [
        {
          rule: 'wantExactly',
          amount: issuers[0].makeAmount(3),
        },
        {
          rule: 'haveExactly',
          amount: issuers[1].makeAmount(7),
        },
      ],
    });

    // 3: Imagine that Alice sends the invite to Bob (not done here
    // since this test doesn't actually have separate vats/parties)

    // 4: Bob inspects the invite payment and checks that the offerToBeMade
    // matches what he expects

    const bobIntendedOffer = harden([
      {
        rule: 'wantExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);

    t.ok(
      offerEqual(
        assays,
        bobInvitePayment.getBalance().quantity.offerToBeMade,
        bobIntendedOffer,
      ),
    );

    // 5: Only after assaying the invite does he unwrap it (destroying
    // the ERTP invite) and accept it
    const bobInvite = await bobInvitePayment.unwrap();
    const bobPayments = [bobMoolaPayment, bobSimoleanPayment];

    // 6: Bob makes his offer
    const bobSeatPayment = await bobInvite.makeOffer(
      bobIntendedOffer,
      bobPayments,
    );

    // 7: Alice unwraps the seatPayment to get her seat
    const aliceSeatPayment = await aliceSeatPaymentP;
    const aliceSeat = await aliceSeatPayment.unwrap();

    // 8: Bob unwraps the seatPayment to get his seat
    const bobSeat = await bobSeatPayment.unwrap();

    // 9: Alice claims her portion of the outcome (what Bob paid in)
    const aliceResult = await aliceSeat.claim();

    // 10: Bob claims his position of the outcome (what Alice paid in)
    const bobResult = await bobSeat.claim();

    // Alice gets back 0 of the kind she put in
    t.equals(aliceResult[0].getBalance().quantity, 0);

    // Alice got what she wanted
    t.deepEquals(aliceResult[1].getBalance(), aliceOffer[1].amount);

    // 11: Alice deposits her winnings to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // 12: Bob deposits his winnings to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Assert that the correct outcome was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    // Now, Alice should have 0 moola and 7 simoleans.
    // Bob should have 3 moola and 0 simoleans.
    t.equals(aliceMoolaPurse.getBalance().quantity, 0);
    t.equals(aliceSimoleanPurse.getBalance().quantity, 7);
    t.equals(bobMoolaPurse.getBalance().quantity, 3);
    t.equals(bobSimoleanPurse.getBalance().quantity, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});

test('zoe.install(swapSrcs) but Alice cancels before bob claims', async t => {
  try {
    const { issuers, mints, zoe, assays } = setup();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(issuers[0].makeAmount(3));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    const aliceSimoleanPurse = mints[1].mint(issuers[1].makeAmount(0));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(issuers[0].makeAmount(0));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();
    const bobSimoleanPurse = mints[1].mint(issuers[1].makeAmount(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdrawAll();

    // 1: Alice creates a swap instance
    const swap = zoe.install(swapSrcs);

    // The issuers are undefined at this step
    t.equals(swap.getIssuers(), undefined);

    // 2: Alice initializes the swap with issuers and an initial offer
    const aliceOffer = harden([
      {
        rule: 'haveExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'wantExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment];

    // Alice gets two kinds of things back - invites (the ability to
    // make an offer) and a seat for herself (the right to claim after
    // an offer has been made). She gets a seat since she made an
    // offer. Bob gets an invite.
    const { seat: aliceSeatPaymentP, invites } = await swap.init(
      issuers,
      aliceOffer,
      alicePayments,
    );
    const [bobInvitePayment] = invites;

    // Check that the issuers and bobInvitePayment are as expected
    t.deepEquals(swap.getIssuers(), issuers);
    t.deepEquals(bobInvitePayment.getBalance().quantity, {
      src: 'swap',
      id: 0,
      offerToBeMade: [
        {
          rule: 'wantExactly',
          amount: issuers[0].makeAmount(3),
        },
        {
          rule: 'haveExactly',
          amount: issuers[1].makeAmount(7),
        },
      ],
    });

    // 3: Imagine that Alice sends the invite to Bob (not done here
    // since this test doesn't actually have separate vats/parties)

    // 4: Bob inspects the invite payment and checks that the offerToBeMade
    // matches what he expects

    const bobIntendedOffer = harden([
      {
        rule: 'wantExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);

    t.ok(
      offerEqual(
        assays,
        bobInvitePayment.getBalance().quantity.offerToBeMade,
        bobIntendedOffer,
      ),
    );

    // 5: Only after assaying the invite does he unwrap it (destroying
    // the ERTP invite) and accept it
    const bobInvite = await bobInvitePayment.unwrap();
    const bobPayments = [bobMoolaPayment, bobSimoleanPayment];

    // 6: Bob makes his offer
    const bobSeatPayment = await bobInvite.makeOffer(
      bobIntendedOffer,
      bobPayments,
    );

    // 7: Alice unwraps the seatPayment to get her seat
    const aliceSeatPayment = await aliceSeatPaymentP;
    const aliceSeat = await aliceSeatPayment.unwrap();

    // 8: Bob unwraps the seatPayment to get his seat
    const bobSeat = await bobSeatPayment.unwrap();

    // 9: Alice cancels
    const aliceResult = await aliceSeat.cancel();

    // 10: Bob still tries to claim his portion of the outcome
    const bobResult = await bobSeat.claim();
    t.equals(swap.getStatus(), 'cancelled');

    // Alice gets back what she put in
    t.deepEquals(aliceResult[0].getBalance(), aliceOffer[0].amount);

    // Alice didn't get any of what she wanted
    t.equals(aliceResult[1].getBalance().quantity, 0);

    // 11: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // 12: Bob deposits his refund to ensure he can
    await bobMoolaPurse.depositAll(bobResult[0]);
    await bobSimoleanPurse.depositAll(bobResult[1]);

    // Assert that the correct refund was achieved.
    // Alice had 3 moola and 0 simoleans.
    // Bob had 0 moola and 7 simoleans.
    t.equals(aliceMoolaPurse.getBalance().quantity, 3);
    t.equals(aliceSimoleanPurse.getBalance().quantity, 0);
    t.equals(bobMoolaPurse.getBalance().quantity, 0);
    t.equals(bobSimoleanPurse.getBalance().quantity, 7);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
