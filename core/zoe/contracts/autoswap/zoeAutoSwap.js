import harden from '@agoric/harden';

import { insist } from '../../../../util/insist';
import makePromise from '../../../../util/makePromise';

import { isOfferSafeForAll, areRightsConserved } from '../../isOfferSafe';
import { mapArrayOnMatrix } from '../../utils';

import { makeState } from '../../state';
import { makeSeatMint } from '../../seatMint';
import { makeMint } from '../../../issuers';

const makeZoe = () => {
  // The seat issuer is a long lived identity over many contract installations
  const { seatIssuer } = makeSeatMint();

  return harden({
    install: srcs => {
      let state;

      const liquidityMint = makeMint('liquidity');
      const liquidityIssuer = liquidityMint.getIssuer();

      // Escrow does the escrowing, but also updates the `purseQuantities`
      // (the current balance of the purses) and `quantities` (the amount
      // escrowed per player per issuer)
      async function escrow(rules, payments) {
        const quantitiesForPlayerPromises = state.purses.map(
          async (purse, i) => {
            // if the user's contractual understanding includes
            // "haveExactly", make sure that they have supplied the
            // coordinating payment
            if (rules[i].rule === 'haveExactly') {
              const amount = await purse.depositExactly(
                rules[i].amount,
                payments[i],
              );
              return amount.quantity;
            }
            return state.strategies[i].empty();
          },
        );

        const quantitiesForPlayer = await Promise.all(
          quantitiesForPlayerPromises,
        );
        // has side-effects
        // eslint-disable-next-line array-callback-return
        quantitiesForPlayer.map((quantity, i) => {
          state.purseQuantities[i] = state.strategies[i].with(
            state.purseQuantities[i],
            quantity,
          );
        });
        state.quantities.push(quantitiesForPlayer);

        // keep the valid offer
        state.offers.push(rules);
      }

      function toAmountMatrix(assays, quantitiesMatrix) {
        const assayMakes = assays.map(assay => assay.make);
        return mapArrayOnMatrix(quantitiesMatrix, assayMakes);
      }

      function makePayments(amountsMatrix) {
        return amountsMatrix.map(row =>
          row.map((amount, i) => state.purses[i].withdraw(amount, 'payout')),
        );
      }

      function allocate(reallocation) {
        reallocation.push(state.poolQuantities);
        insist(
          areRightsConserved(
            state.strategies,
            state.purseQuantities,
            reallocation,
          ),
        )`Rights are not conserved in the proposed reallocation`;

        const amounts = toAmountMatrix(state.assays, reallocation);
        insist(
          isOfferSafeForAll(state.assays, state.offers, amounts),
        )`The proposed reallocation was not offer safe`;

        state.purseQuantities = state.poolQuantities;
        // don't make payments for the pool
        // TODO: fix this hack

        const payments = makePayments([amounts[0]]);
        state.results.map((result, i) => result.res(payments[i]));
        state.offers = [];
        state.results = [];
        state.quantities = [];
      }

      const makeOffer = async (offerMade, payments) => {
        const result = makePromise();
        // fail-fast if the offer isn't valid
        if (
          !srcs.isValidOffer(state.issuers, offerMade, state.poolQuantities)
        ) {
          result.reject('offer was invalid');
          return result.p;
        }

        // TODO: handle good offers but some bad payments. We may have
        // already deposited some good payments by the time the bad
        // payments occur.
        await escrow(offerMade, payments);
        state.results.push(result);

        if (srcs.canReallocate(state.status, state.offers)) {
          const { poolQuantities, quantities } = srcs.reallocate(
            state.poolQuantities,
            state.quantities,
          );
          state.poolQuantities = poolQuantities;
          allocate(quantities);
        }
        return result.p;
      };

      const institution = harden({
        async init(issuers) {
          insist(srcs.areIssuersValid(issuers))`issuers are not valid`;

          state = makeState(issuers);
          state.status = 'open';
          return harden({
            addLiquidity: async (offer, payments) => {
              insist(srcs.isValidOfferAddingLiquidity(issuers, offer));

              const addedLiquidityP = state.purses.map(async (purse, i) => {
                // if the user's contractual understanding includes
                // "haveExactly", make sure that they have supplied the
                // coordinating payment
                if (offer[i].rule === 'haveExactly') {
                  const amount = await purse.depositExactly(
                    offer[i].amount,
                    payments[i],
                  );
                  return amount.quantity;
                }
                return state.strategies[i].empty();
              });

              const addedLiquidity = await Promise.all(addedLiquidityP);
              // has side-effects
              // eslint-disable-next-line array-callback-return
              addedLiquidity.map((quantity, i) => {
                state.poolQuantities[i] = state.strategies[i].with(
                  state.poolQuantities[i],
                  quantity,
                );
                state.purseQuantities[i] = state.strategies[i].with(
                  state.purseQuantities[i],
                  quantity,
                );
              });

              // TODO: need to return a payment of liquidity tokens that
              // represents the share of the pool, rather than 100
              const newPurse = liquidityMint.mint(100);
              return newPurse.withdrawAll();
            },
            removeLiquidity: (_offer, _payments) => {},
            getPrice: amountsIn =>
              srcs.getPrice(state.poolQuantities, state.assays, amountsIn),
            makeOffer,
            getLiquidityIssuer: () => liquidityIssuer,
            getPurseQuantities: _ => state.purseQuantities, // delete after testing
            getPoolQuantities: _ => state.poolQuantities, // delete after testing
          });
        },
        getIssuers: _ =>
          (state && state.issuers && state.issuers.slice()) || undefined,
        getStatus: _ => (state && state.status) || undefined,
      });
      return institution;
    },
    getIssuer: () => seatIssuer,
  });
};
export { makeZoe };
