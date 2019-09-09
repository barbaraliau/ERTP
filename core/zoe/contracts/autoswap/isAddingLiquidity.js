import harden from '@agoric/harden';

/*
 * Valid format for adding liquidity:
 * [
 *   {
 *      rule: 'haveExactly',
 *      amount: amount1,
 *   },
 *   {
 *      rule: 'haveExactly',
 *      amount: amount2,
 *   }
 * ]
 */

const okContent = offer =>
  offer[0].rule === 'haveExactly' && offer[1].rule === 'haveExactly';

const isAddingLiquidity = harden({
  okContent,
});

export { isAddingLiquidity };
