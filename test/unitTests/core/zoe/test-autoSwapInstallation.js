import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../core/zoe/contracts/autoswap/zoeAutoSwap';
import { autoswapSrcs } from '../../../../core/zoe/contracts/autoswap/autoswap';
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

test.only('zoe.install(swapSrcs) with valid offers', async t => {
  try {
    const { issuers, mints, zoe, assays } = setup();

    // Setup Alice
    const aliceMoolaPurse = mints[0].mint(issuers[0].makeAmount(10));
    const aliceMoolaPayment = aliceMoolaPurse.withdrawAll();
    // Let's assume that simoleans are worth 2x as much as moola
    const aliceSimoleanPurse = mints[1].mint(issuers[1].makeAmount(5));
    const aliceSimoleanPayment = aliceSimoleanPurse.withdrawAll();

    // Setup Bob
    const bobMoolaPurse = mints[0].mint(issuers[0].makeAmount(2));
    const bobMoolaPayment = bobMoolaPurse.withdrawAll();
    const bobSimoleanPurse = mints[1].mint(issuers[1].makeAmount(7));
    const bobSimoleanPayment = bobSimoleanPurse.withdraw(issuers[1].makeAmount(3));

    // 1: Alice creates an autoswap instance
    const autoswap = zoe.install(autoswapSrcs);

    // The issuers are undefined at this step
    t.equals(autoswap.getIssuers(), undefined);

    // 2: Alice initializes the autoswap with issuers
    const moolaToSimAutoswap = await autoswap.init(issuers);
    const liquidityIssuer = moolaToSimAutoswap.getLiquidityIssuer();
    // Alice gets an object back that has 5 methods:
    // 1) addLiquidity
    // 2) removeLiquidity
    // 3) getPrice
    // 4) makeOffer
    // 5) getLiquidityIssuer
    // She can share this object widely

    // These are not ERTP payments because we are not trying to
    // restrict access to the autoswap. Anyone can add liquidity or
    // make an offer

    // 3: Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOffer = harden([
      {
        rule: 'haveExactly',
        amount: issuers[0].makeAmount(10),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(5),
      },
      {
        rule: 'wantAtLeast',
        amount: liquidityIssuer.makeAmount(10),
      },
    ]);
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

    const liquidityPayment = await moolaToSimAutoswap.addLiquidity(
      aliceOffer,
      alicePayments,
    );

    // purseQuantities are 10, 5

    t.deepEquals(liquidityPayment.getBalance().quantity, 100);

    // 4: Imagine that Alice gives bob access to the
    // moolaToSimAutoswap object

    // 5: Bob looks up the price of 2 moola in simoleans
    const amount2Moola = issuers[0].makeAmount(2);
    const simoleanAmount = moolaToSimAutoswap.getPrice([
      amount2Moola,
      undefined,
    ]);
    t.deepEquals(simoleanAmount, issuers[1].makeAmount(1));

    // 6: Bob makes an offer and swaps

    const moolaForSim = harden([
      {
        rule: 'haveExactly',
        amount: issuers[0].makeAmount(2),
      },
      {
        rule: 'wantAtLeast',
        amount: issuers[1].makeAmount(1),
      },
    ]);
    const moolaForSimPayments = [bobMoolaPayment, undefined];
    const bobsNewSimPayment = await moolaToSimAutoswap.makeOffer(
      moolaForSim,
      moolaForSimPayments,
    );

    // purseQuantities 12, 4

    t.deepEqual(bobsNewSimPayment[0].getBalance(), issuers[0].makeAmount(0));
    t.deepEqual(bobsNewSimPayment[1].getBalance(), issuers[1].makeAmount(1));

    // 7: Bob looks up the price of 3 simoleans

    const amount3Sims = issuers[1].makeAmount(3);
    const moolaAmount = moolaToSimAutoswap.getPrice([undefined, amount3Sims]);
    t.deepEquals(moolaAmount, issuers[0].makeAmount(6));

    // 8: Bob makes another offer and swaps
    const simsForMoola = harden([
      {
        rule: 'wantAtLeast',
        amount: issuers[0].makeAmount(6),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(3),
      },
    ]);
    const simsForMoolaPayments = [undefined, bobSimoleanPayment];
    const bobsNewMoolaPayment = await moolaToSimAutoswap.makeOffer(
      simsForMoola,
      simsForMoolaPayments,
    );

    // purseQuantities 6, 7

    t.deepEqual(bobsNewMoolaPayment[0].getBalance(), issuers[0].makeAmount(6));
    t.deepEqual(bobsNewMoolaPayment[1].getBalance(), issuers[1].makeAmount(3));

    // 8: Alice removes some of her liquidity


    // const [bobInvitePayment] = invites;

    // // Check that the issuers and bobInvitePayment are as expected
    // t.deepEquals(swap.getIssuers(), issuers);
    // t.deepEquals(bobInvitePayment.getBalance().quantity, {
    //   src: 'swap',
    //   id: 0,
    //   offerToBeMade: [
    //     {
    //       rule: 'wantExactly',
    //       amount: issuers[0].makeAmount(3),
    //     },
    //     {
    //       rule: 'haveExactly',
    //       amount: issuers[1].makeAmount(7),
    //     },
    //   ],
    // });

    // // 3: Imagine that Alice sends the invite to Bob (not done here
    // // since this test doesn't actually have separate vats/parties)

    // // 4: Bob inspects the invite payment and checks that the offerToBeMade
    // // matches what he expects

    // const bobIntendedOffer = harden([
    //   {
    //     rule: 'wantExactly',
    //     amount: issuers[0].makeAmount(3),
    //   },
    //   {
    //     rule: 'haveExactly',
    //     amount: issuers[1].makeAmount(7),
    //   },
    // ]);

    // t.ok(
    //   offerEqual(
    //     assays,
    //     bobInvitePayment.getBalance().quantity.offerToBeMade,
    //     bobIntendedOffer,
    //   ),
    // );

    // // 5: Only after assaying the invite does he unwrap it (destroying
    // // the ERTP invite) and accept it
    // const bobInvite = await bobInvitePayment.unwrap();
    // const bobPayments = [bobMoolaPayment, bobSimoleanPayment];

    // // 6: Bob makes his offer
    // const bobSeatPayment = await bobInvite.makeOffer(
    //   bobIntendedOffer,
    //   bobPayments,
    // );

    // // 7: Alice unwraps the seatPayment to get her seat
    // const aliceSeatPayment = await aliceSeatPaymentP;
    // const aliceSeat = await aliceSeatPayment.unwrap();

    // // 8: Bob unwraps the seatPayment to get his seat
    // const bobSeat = await bobSeatPayment.unwrap();

    // // 9: Alice claims her portion of the outcome (what Bob paid in)
    // const aliceResult = await aliceSeat.claim();

    // // 10: Bob claims his position of the outcome (what Alice paid in)
    // const bobResult = await bobSeat.claim();

    // // Alice gets back 0 of the kind she put in
    // t.equals(aliceResult[0].getBalance().quantity, 0);

    // // Alice got what she wanted
    // t.deepEquals(aliceResult[1].getBalance(), aliceOffer[1].amount);

    // // 11: Alice deposits her winnings to ensure she can
    // await aliceMoolaPurse.depositAll(aliceResult[0]);
    // await aliceSimoleanPurse.depositAll(aliceResult[1]);

    // // 12: Bob deposits his winnings to ensure he can
    // await bobMoolaPurse.depositAll(bobResult[0]);
    // await bobSimoleanPurse.depositAll(bobResult[1]);

    // // Assert that the correct outcome was achieved.
    // // Alice had 3 moola and 0 simoleans.
    // // Bob had 0 moola and 7 simoleans.
    // // Now, Alice should have 0 moola and 7 simoleans.
    // // Bob should have 3 moola and 0 simoleans.
    // t.equals(aliceMoolaPurse.getBalance().quantity, 0);
    // t.equals(aliceSimoleanPurse.getBalance().quantity, 7);
    // t.equals(bobMoolaPurse.getBalance().quantity, 3);
    // t.equals(bobSimoleanPurse.getBalance().quantity, 0);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
