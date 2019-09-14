import harden from '@agoric/harden';
import { calcReallocation } from './calcReallocation';
import { calcSwap } from './calcSwap';
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
    const poolOfferId = zoeInstance.makeEmptyOffer();
    const getPoolQuantities = () =>
      zoeInstance.getQuantitiesFor(harden([poolOfferId]))[0];

    const makeLiquidityOfferKeeper = () => {

      return harden({
        recordLiquidityOffer: offerId => {
          const addedLiquidity = zoeInstance.getQuantitiesFor(
            harden([offerId]),
          )[0];
          const oldPoolQuantities = getPoolQuantities();

          const newPoolQuantities = withQuantities(
            strategies,
            oldPoolQuantities,
            addedLiquidity,
          );

          // Set the liquidity offer to empty and add it all to the
          // pool offer
          zoeInstance.reallocate(harden([offerId, poolOfferId]), [
            zoeInstance.makeEmptyQuantities(),
            newPoolQuantities,
          ]);
        },
        getPoolQuantities,
      });
    };

    const { recordLiquidityOffer } = makeLiquidityOfferKeeper();

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

        recordLiquidityOffer(id);

        // TODO: mint an appropriate amount
        // TODO: figure out how to make zoe do this in the winnings
        // maybe autoswap makes an offer with only liquidity tokens
        // and then reallocates those?
        const newPurse = liquidityMint.mint(100);
        const newPayment = newPurse.withdrawAll();
        offerResult.res(newPayment);
        zoeInstance.eject(harden([id]));
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
      getPrice: amountsIn =>
        getPrice(zoeInstance.getAssays(), getPoolQuantities(), amountsIn),
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
