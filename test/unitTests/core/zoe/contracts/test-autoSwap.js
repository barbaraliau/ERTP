import { test } from 'tape-promise/tape';
import harden from '@agoric/harden';

import { makeZoe } from '../../../../../core/zoe/zoe';
import { makeAutoSwapMaker } from '../../../../../core/zoe/contracts/autoSwap/autoSwap';
import { makeMint } from '../../../../../core/issuers';

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

test('autoSwap with valid offers', async t => {
  try {
    const { issuers, mints, zoe } = setup();
    const escrowReceiptIssuer = zoe.getEscrowReceiptIssuer();

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
    const bobSimoleanPayment = bobSimoleanPurse.withdraw(
      issuers[1].makeAmount(3),
    );

    // 1: Alice creates an autoswap instance

    const { liquidityIssuer, makeAutoSwap } = makeAutoSwapMaker();
    const allIssuers = [...issuers, liquidityIssuer];

    const { zoeInstance, governingContract: autoswap } = zoe.makeInstance(
      makeAutoSwap,
      allIssuers,
    );

    // The issuers are defined at this step
    t.deepEquals(zoeInstance.getIssuers(), allIssuers);

    const actualLiquidityIssuer = autoswap.getLiquidityIssuer();
    t.deepEquals(actualLiquidityIssuer, liquidityIssuer);

    // 2: Alice adds liquidity
    // 10 moola = 5 simoleans at the time of the liquidity adding
    // aka 2 moola = 1 simolean
    const aliceOffer = harden([
      {
        rule: 'haveExactly',
        amount: allIssuers[0].makeAmount(10),
      },
      {
        rule: 'haveExactly',
        amount: allIssuers[1].makeAmount(5),
      },
      {
        rule: 'wantAtLeast',
        amount: allIssuers[2].makeAmount(10),
      },
    ]);
    // Currently, alice can only 'wantAtLeast' 0
    // TODO: figure out how to enforce offer safety for the liquidity tokens
    const alicePayments = [aliceMoolaPayment, aliceSimoleanPayment, undefined];

    const {
      escrowReceipt: allegedAliceEscrowReceipt,
      claimWinnings: aliceClaimWinnings,
    } = await zoeInstance.escrow(aliceOffer, alicePayments);

    // 3: Alice does a claimAll on the escrowReceipt payment
    const aliceEscrowReceipt = await escrowReceiptIssuer.claimAll(
      allegedAliceEscrowReceipt,
    );

    const liquidityOk = await autoswap.addLiquidity(aliceEscrowReceipt);

    t.equals(liquidityOk, 'added liquidity');

    const aliceAddLiquiditySeat = await aliceClaimWinnings.unwrap();

    const liquidityPayments = await aliceAddLiquiditySeat.getWinnings();

    t.deepEquals(
      liquidityPayments[2].getBalance(),
      liquidityIssuer.makeAmount(10),
    );
    t.deepEquals(autoswap.getPoolQuantities(), [10, 5, 0]);

    // 4: Imagine that Alice gives bob access to autoswap

    // 5: Bob looks up the price of 2 moola in simoleans
    const amount2Moola = issuers[0].makeAmount(2);
    const simoleanAmount = autoswap.getPrice([amount2Moola, undefined]);
    t.deepEquals(simoleanAmount, issuers[1].makeAmount(1));

    // 6: Bob escrows

    const bobMoolaForSimOfferDesc = harden([
      {
        rule: 'haveExactly',
        amount: allIssuers[0].makeAmount(2),
      },
      {
        rule: 'wantAtLeast',
        amount: allIssuers[1].makeAmount(1),
      },
      {
        rule: 'wantAtLeast',
        amount: allIssuers[2].makeAmount(0),
      },
    ]);
    const bobMoolaForSimPayments = [bobMoolaPayment, undefined, undefined];

    const {
      escrowReceipt: allegedBobEscrowReceipt,
      claimWinnings: bobClaimWinnings,
    } = await zoeInstance.escrow(
      bobMoolaForSimOfferDesc,
      bobMoolaForSimPayments,
    );

    // 3: Bob does a claimAll on the escrowReceipt payment
    const bobEscrowReceipt = await escrowReceiptIssuer.claimAll(
      allegedBobEscrowReceipt,
    );

    // 7: Bob swaps
    const offerOk = await autoswap.makeOffer(bobEscrowReceipt);
    t.equal(offerOk, 'offer successfully made');

    const bobClaimWinningsSeat = await bobClaimWinnings.unwrap();

    const bobsNewSimPayment = await bobClaimWinningsSeat.getWinnings();

    t.deepEqual(bobsNewSimPayment[0].getBalance(), issuers[0].makeAmount(0));
    t.deepEqual(bobsNewSimPayment[1].getBalance(), issuers[1].makeAmount(1));
    t.deepEquals(autoswap.getPoolQuantities(), [12, 4, 0]);

    // 7: Bob looks up the price of 3 simoleans

    const amount3Sims = issuers[1].makeAmount(3);
    const moolaAmount = autoswap.getPrice([undefined, amount3Sims]);
    t.deepEquals(moolaAmount, issuers[0].makeAmount(6));

    // 8: Bob makes another offer and swaps
    const bobSimsForMoolaOfferDesc = harden([
      {
        rule: 'wantAtLeast',
        amount: issuers[0].makeAmount(6),
      },
      {
        rule: 'haveExactly',
        amount: issuers[1].makeAmount(3),
      },
      {
        rule: 'wantAtLeast',
        amount: allIssuers[2].makeAmount(0),
      },
    ]);
    const simsForMoolaPayments = [undefined, bobSimoleanPayment, undefined];

    const {
      escrowReceipt: bobsSimsForMoolaEscrowReceipt,
      claimWinnings: bobSimsForMoolaClaimWinnings,
    } = await zoeInstance.escrow(
      bobSimsForMoolaOfferDesc,
      simsForMoolaPayments,
    );

    const simsForMoolaOk = await autoswap.makeOffer(
      bobsSimsForMoolaEscrowReceipt,
    );
    t.equal(simsForMoolaOk, 'offer successfully made');

    const bobSimsForMoolaWinningsSeat = await bobSimsForMoolaClaimWinnings.unwrap();

    const bobsNewMoolaPayment = await bobSimsForMoolaWinningsSeat.getWinnings();

    t.deepEqual(bobsNewMoolaPayment[0].getBalance(), issuers[0].makeAmount(6));
    t.deepEqual(bobsNewMoolaPayment[1].getBalance(), issuers[1].makeAmount(0));
    t.deepEqual(autoswap.getPoolQuantities(), [6, 7, 0]);

    // 8: Alice removes her liquidity
    // She's not picky...
    const aliceRemoveLiquidityOfferDesc = harden([
      {
        rule: 'wantAtLeast',
        amount: allIssuers[0].makeAmount(0),
      },
      {
        rule: 'wantAtLeast',
        amount: allIssuers[1].makeAmount(0),
      },
      {
        rule: 'haveExactly',
        amount: allIssuers[2].makeAmount(10),
      },
    ]);

    const {
      escrowReceipt: aliceRemoveLiquidityEscrowReceipt,
      claimWinnings: aliceRemoveLiquidityWinnings,
    } = await zoeInstance.escrow(
      aliceRemoveLiquidityOfferDesc,
      liquidityPayments,
    );

    const removeLiquidityResult = await autoswap.removeLiquidity(
      aliceRemoveLiquidityEscrowReceipt,
    );
    t.equals(removeLiquidityResult, 'liquidity successfully removed');

    const aliceRemoveLiquidityWinningsSeat = await aliceRemoveLiquidityWinnings.unwrap();

    const aliceWinningsPayments = await aliceRemoveLiquidityWinningsSeat.getWinnings();

    t.deepEquals(
      aliceWinningsPayments[0].getBalance(),
      allIssuers[0].makeAmount(6),
    );
    t.deepEquals(
      aliceWinningsPayments[1].getBalance(),
      allIssuers[1].makeAmount(7),
    );
    t.deepEquals(
      aliceWinningsPayments[2].getBalance(),
      allIssuers[2].makeAmount(0),
    );
    t.deepEquals(autoswap.getPoolQuantities(), [0, 0, 10]);
  } catch (e) {
    t.assert(false, e);
    console.log(e);
  } finally {
    t.end();
  }
});
