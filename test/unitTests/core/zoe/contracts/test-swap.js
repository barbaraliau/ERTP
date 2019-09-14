import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../../core/zoe/zoe';
import { makeSwapMaker } from '../../../../../core/zoe/contracts/swap/swap';
import { swapSrcs } from '../../../../../core/zoe/contracts/swap/swapSrcs';
import { makeMint } from '../../../../../core/issuers';
import { offerEqual } from '../../../../../core/zoe/utils/utils';

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

test('zoe.makeInstance with trivial middle layer and srcs', t => {
  try {
    // Zoe should be long-lived.
    const { zoe, issuers, assays } = setup();
    const governingContract = {
      areIssuersValid: _issuers => true,
      reallocate: allocations => allocations,
    };

    const makeTrivialMaker = govC => zoeI => {
      const zoeAssays = zoeI.getAssays();
      t.deepEqual(zoeAssays, assays);
      t.ok(govC.areIssuersValid(zoeI.getIssuers()));
      t.deepEqual(
        govC.reallocate(zoeI.getQuantitiesFor(harden([]), harden([[]]))),
        [],
      );
      return harden({
        getSomething: () => 'something',
      });
    };

    const makeTrivial = makeTrivialMaker(governingContract);

    const { zoeInstance, governingContract: trivial } = zoe.makeInstance(
      makeTrivial,
      issuers,
    );
    t.deepEqual(zoeInstance.getIssuers(), issuers);
    t.deepEqual(trivial.getSomething(), 'something');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('zoe.makeInstance with swap', async t => {
  try {
    const { issuers, mints, zoe, assays } = setup();
    const escrowReceiptIssuer = zoe.getEscrowReceiptIssuer();

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
    const makeSwap = makeSwapMaker(swapSrcs);
    const { zoeInstance, governingContract: swap } = zoe.makeInstance(
      makeSwap,
      issuers,
    );

    // The issuers are defined at this step
    t.deepEquals(swap.getIssuers(), issuers);

    // 2: Alice escrows with the zoeInstance
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
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      claimWinnings: aliceClaimWinnings,
    } = await zoeInstance.escrow(aliceOffer, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptIssuer.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 3: Alice initializes the swap with her escrow receipt

    // Alice gets two kinds of things back - invites (the ability to
    // make an offer) and a seat for herself (the right to claim after
    // an offer has been made). She gets a seat since she made an
    // offer. Bob gets an invite.
    const { outcome: aliceOutcome, invites } = await swap.init(
      aliceEscrowReceipt,
    );
    const [bobInvitePayment] = invites;

    // Check that the issuers and bobInvitePayment are as expected
    t.deepEquals(swap.getIssuers(), issuers);
    t.deepEquals(bobInvitePayment.getBalance().quantity.src, 'swap');
    t.deepEquals(bobInvitePayment.getBalance().quantity.offerToBeMade, [
      {
        rule: 'wantExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);

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

    t.equal(bobInvitePayment.getBalance().quantity.src, 'swap');

    // 5: Only after assaying the invite does he unwrap it (destroying
    // the ERTP invite) and accept it
    const bobInvite = await bobInvitePayment.unwrap();
    const bobPayments = [bobMoolaPayment, bobSimoleanPayment];

    // 6: Bob escrows
    const {
      escrowReceipt: allegedBobEscrowReceipt,
      claimWinnings: bobClaimWinnings,
    } = await zoeInstance.escrow(bobIntendedOffer, bobPayments);

    // 7: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptIssuer.claimAll(
      allegedBobEscrowReceipt,
    );

    // 8: Bob makes an offer with his escrow receipt
    const bobOutcome = await bobInvite.makeOffer(bobEscrowReceipt);

    t.equals(bobOutcome, 'offer successfully made');
    t.equals(await aliceOutcome, 'offer successfully made');

    // 7: Alice unwraps the claimWinnings to get her seat
    const aliceSeat = await aliceClaimWinnings.unwrap();

    // 8: Bob unwraps his claimWinnings to get his seat
    const bobSeat = await bobClaimWinnings.unwrap();

    // 9: Alice claims her portion of the outcome (what Bob paid in)
    const aliceResult = await aliceSeat.getWinnings();

    // 10: Bob claims his position of the outcome (what Alice paid in)
    const bobResult = await bobSeat.getWinnings();

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

test.skip('zoe.makeInstance with swap but Alice cancels before Bob claims', async t => {
  try {
    const { issuers, mints, zoe, assays } = setup();
    const escrowReceiptIssuer = zoe.getEscrowReceiptIssuer();

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
    const makeSwap = makeSwapMaker(swapSrcs);
    const { zoeInstance, governingContract: swap } = zoe.makeInstance(
      makeSwap,
      issuers,
    );

    // The issuers are defined at this step
    t.deepEquals(swap.getIssuers(), issuers);

    // 2: Alice escrows with the zoeInstance
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
    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      claimWinnings: aliceClaimWinnings,
    } = await zoeInstance.escrow(aliceOffer, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptIssuer.claimAll(
      allegedAliceEscrowReceipt,
    );

    // 3: Alice initializes the swap with her escrow receipt

    // Alice gets two kinds of things back - invites (the ability to
    // make an offer) and a seat for herself (the right to claim after
    // an offer has been made). She gets a seat since she made an
    // offer. Bob gets an invite.
    const { outcome: aliceOutcome, invites } = await swap.init(
      aliceEscrowReceipt,
    );
    const [bobInvitePayment] = invites;

    // Check that the issuers and bobInvitePayment are as expected
    t.deepEquals(swap.getIssuers(), issuers);
    t.deepEquals(bobInvitePayment.getBalance().quantity.src, 'swap');
    t.deepEquals(bobInvitePayment.getBalance().quantity.offerToBeMade, [
      {
        rule: 'wantExactly',
        amount: issuers[0].makeAmount(3),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(7),
      },
    ]);

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
    t.equal(bobInvitePayment.getBalance().quantity.src, 'swap');

    // 5: Only after assaying the invite does he unwrap it (destroying
    // the ERTP invite) and accept it
    const bobInvite = await bobInvitePayment.unwrap();
    const bobPayments = [bobMoolaPayment, bobSimoleanPayment];

    // 6: Alice unwraps the claimWinnings to get her seat
    await aliceClaimWinnings.unwrap();

    // 7: Alice cancels before bob makes his offer
    const aliceResult = await aliceOutcome.cancel();

    // 6: Bob still tries to make his offer
    t.rejects(
      bobInvite.makeOffer(bobIntendedOffer, bobPayments),
      /swap was cancelled/,
    );

    // TODO: we need offer safety on this refund
    t.equals(bobPayments[0].getBalance().quantity, 0);
    t.equals(bobPayments[1].getBalance().quantity, 7);

    // Alice gets back what she put in
    t.deepEquals(aliceResult[0].getBalance(), aliceOffer[0].amount);

    // Alice didn't get any of what she wanted
    t.equals(aliceResult[1].getBalance().quantity, 0);

    // 11: Alice deposits her refund to ensure she can
    await aliceMoolaPurse.depositAll(aliceResult[0]);
    await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // 12: Bob deposits his original payments to ensure he can
    await bobMoolaPurse.depositAll(bobPayments[0]);
    await bobSimoleanPurse.depositAll(bobPayments[1]);

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
