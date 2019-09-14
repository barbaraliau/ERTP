import harden from '@agoric/harden';
import { calcReallocation } from './calcReallocation';
import { calcSwap } from './calcSwap';
import { calcLiquidityQOut } from './calcLiquidityQOut';
import { makeMint } from '../../../issuers';

import makePromise from '../../../../util/makePromise';

import {
  makeHasOkLength,
  makeHasOkRules,
  hasOkIssuers,
  withQuantities,
} from '../../utils/utils';

const hasOkRules = makeHasOkRules([
  ['haveExactly', 'wantExactly'],
  ['wantExactly', 'haveExactly'],
]);

const okSwap = (poolQuantities, newOffer) => {
  // Is there a 'wantAtLeast' in the rules? If so, make sure that the
  // amount that would be returned if we performed the swap is greater
  // than or equal to the 'wantAtLeast' amount

  // Are we swapping the first asset kind for the second or vice
  // versa?
  const tokenInIndex = newOffer[0].rule === 'haveExactly' ? 0 : 1;
  const tokenOutIndex = tokenInIndex === 0 ? 1 : 0;

  const tokenInQ = newOffer[tokenInIndex].amount.quantity;
  const wantAtLeastQ = newOffer[tokenOutIndex].amount.quantity;

  const { tokenOutQ } = calcSwap(
    poolQuantities[tokenInIndex],
    poolQuantities[tokenOutIndex],
    tokenInQ,
  );
  return wantAtLeastQ === undefined || tokenOutQ >= wantAtLeastQ;
};

// TODO: figure out how to include liquidity Issuer in zoe
// const okAddingLiquidityRules = offer =>
//   offer[0].rule === 'haveExactly' &&
//   offer[1].rule === 'haveExactly' &&
//   offer[2].rule === 'wantAtLeast';

const okAddingLiquidityRules = offer =>
  offer[0].rule === 'haveExactly' && offer[1].rule === 'haveExactly';

const isValidOfferAddingLiquidity = (issuers, newOffer) => {
  return (
    makeHasOkLength(3)(newOffer) &&
    hasOkIssuers(issuers, newOffer) &&
    okAddingLiquidityRules(newOffer)
  );
};

const isValidOffer = (issuers, poolQuantities, newOffer) => {
  return (
    makeHasOkLength(3)(newOffer) &&
    hasOkRules(newOffer) &&
    hasOkIssuers(issuers, newOffer) &&
    okSwap(poolQuantities, newOffer)
  );
};

const getPrice = (assays, poolQuantities, amountsIn) => {
  const tokenInIndex = amountsIn[0] === undefined ? 1 : 0;
  const tokenOutIndex = 1 - tokenInIndex;

  const tokenInQ = amountsIn[tokenInIndex].quantity;
  const { tokenOutQ } = calcSwap(
    poolQuantities[tokenInIndex],
    poolQuantities[tokenOutIndex],
    tokenInQ,
  );
  return assays[tokenOutIndex].make(tokenOutQ);
};

const makeAutoSwapMaker = () => {
  const liquidityMint = makeMint('liquidity');
  const liquidityIssuer = liquidityMint.getIssuer();

  const makeAutoSwap = zoeInstance => {
    const escrowReceiptIssuer = zoeInstance.getEscrowReceiptIssuer();
    const strategies = zoeInstance.getStrategies();
    const assays = zoeInstance.getAssays();
    const poolOfferId = zoeInstance.escrowEmpty();
    const getPoolQuantities = () =>
      zoeInstance.getQuantitiesFor(harden([poolOfferId]))[0];

    const recordLiquidityOffer = async offerId => {
      const addedLiquidity = zoeInstance.getQuantitiesFor(harden([offerId]))[0];
      const oldPoolQuantities = getPoolQuantities();

      const newPoolQuantities = withQuantities(
        strategies,
        oldPoolQuantities,
        addedLiquidity,
      );

      const liquidityQOut = calcLiquidityQOut(
        oldPoolQuantities[2],
        oldPoolQuantities[0],
        addedLiquidity[0],
      );

      const newPurse = liquidityMint.mint(liquidityQOut);
      const newPayment = newPurse.withdrawAll();

      const liquidityOfferDesc = [
        {
          rule: 'wantAtLeast',
          amount: assays[0].empty(),
        },
        {
          rule: 'wantAtLeast',
          amount: assays[1].empty(),
        },
        {
          rule: 'haveExactly',
          amount: assays[2].make(liquidityQOut),
        },
      ];

      const { offerId: liquidityOfferId } = await zoeInstance.escrowAndGetId(
        liquidityOfferDesc,
        harden([undefined, undefined, newPayment]),
      );

      const quantitiesToPlayer = zoeInstance.makeEmptyQuantities();
      quantitiesToPlayer[2] = liquidityQOut;

      // Set the liquidity offer to empty and add it all to the
      // pool offer
      zoeInstance.reallocate(harden([offerId, poolOfferId, liquidityOfferId]), [
        quantitiesToPlayer,
        newPoolQuantities,
        zoeInstance.makeEmptyQuantities(),
      ]);
    };

    const depositEscrowReceipt = async escrowReceipt => {
      const amount = await escrowReceiptIssuer
        .makeEmptyPurse()
        .depositAll(escrowReceipt);
      return amount.quantity;
    };
    const autoSwap = harden({
      // TODO: figure out how to add the liquidity issuer to zoe
      // For now, the escrowReceipt is just for the two underlying right
      // issuers
      addLiquidity: async escrowReceipt => {
        const offerResult = makePromise();
        const { id, offerMade: offerMadeDesc } = await depositEscrowReceipt(
          escrowReceipt,
        );

        // fail-fast if the offerDesc isn't valid
        if (
          !isValidOfferAddingLiquidity(zoeInstance.getIssuers(), offerMadeDesc)
        ) {
          offerResult.rej('offer was invalid');
          return offerResult.p;
          // TODO: refund escrow receipt?
        }

        await recordLiquidityOffer(id);
        zoeInstance.eject(harden([id]));
        offerResult.res('added liquidity');
        return offerResult.p;
      },
      // TODO: figure out how to enforce offer safety for this
      removeLiquidity: async escrowReceipt => {
        const result = makePromise();
        const { id } = await depositEscrowReceipt(escrowReceipt);

        // TODO: check if is valid offer for removing liquidity (have
        // liquidity tokens?)

        // TODO: calculate correct amount of underlying rights to pay
        // out. Right now we give it all out at once which is very dumb but
        // great for testing

        const offerIds = harden([poolOfferId, id]);
        const oldQuantities = zoeInstance.getQuantitiesFor(offerIds);

        // For now, just switch the pool and the player's allocations
        // TODO: actually calculate this
        const newQuantities = [oldQuantities[1], oldQuantities[0]];

        zoeInstance.reallocate(offerIds, newQuantities);
        // only eject the player, not the pool
        zoeInstance.eject(harden([id]));
        result.res('liquidity successfully removed');
        return result.p;
      },
      getPrice: amountsIn => getPrice(assays, getPoolQuantities(), amountsIn),
      makeOffer: async escrowReceipt => {
        const offerResult = makePromise();
        const { id, offerMade: offerMadeDesc } = await depositEscrowReceipt(
          escrowReceipt,
        );

        // fail-fast if the offerDesc isn't valid
        if (
          !isValidOffer(
            zoeInstance.getIssuers(),
            getPoolQuantities(),
            offerMadeDesc,
          )
        ) {
          offerResult.rej('offer was invalid');
          return offerResult.p;
          // TODO: refund escrow receipt?
        }

        const offerIds = harden([poolOfferId, id]);

        // reallocate and eject immediately
        const oldQuantities = zoeInstance.getQuantitiesFor(offerIds);
        const newQuantities = calcReallocation(oldQuantities);

        zoeInstance.reallocate(offerIds, newQuantities);
        // only eject the player, not the pool
        zoeInstance.eject(harden([id]));
        offerResult.res('offer successfully made');
        return offerResult.p;
      },
      getLiquidityIssuer: () => liquidityIssuer,
      getIssuers: zoeInstance.getIssuers,
      getPoolQuantities,
    });
    return autoSwap;
  };

  return harden({
    makeAutoSwap,
    liquidityIssuer,
  });
};
export { makeAutoSwapMaker };
