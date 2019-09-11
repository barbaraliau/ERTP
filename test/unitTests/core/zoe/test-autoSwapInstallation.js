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

test.skip('zoe.install(autoswapSrcs) with valid offers', async t => {
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
    t.deepEquals(moolaToSimAutoswap.getPurseQuantities(), [10, 5]);
    t.deepEquals(moolaToSimAutoswap.getPoolQuantities(), [10, 5]);

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
    t.deepEquals(moolaToSimAutoswap.getPurseQuantities(), [12, 4]);
    t.deepEquals(moolaToSimAutoswap.getPoolQuantities(), [12, 4]);

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
    t.deepEquals(moolaToSimAutoswap.getPurseQuantities(), [6, 7]);
    t.deepEquals(moolaToSimAutoswap.getPoolQuantities(), [6, 7]);

    // 8: Alice removes some of her liquidity
    // TODO
    
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
