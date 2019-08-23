/* global E makePromise */
import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import { makeStateMachine } from './stateMachine';
import { isOfferSafeForAll, areRightsConserved } from './isOfferSafe';
import { mapArrayOnMatrix } from './utils';
import { toAmountMatrix } from './hoists';

const makeInstitution = srcs => {
  const sm = makeStateMachine(srcs.startState, srcs.allowedTransitions);

  // make safe for mechanism code to have (harden?)
  let issuers; // array
  let assays; // array
  let strategies; // array
  let results; // promises that need to be resolved to payments per player

  let offers; // matrix: rules per player
  let quantities; // matrix: quantities per player

  // hold closely - do not give to mechanism
  let purses; // array
  let purseQuantities; // array

  let contractData; // an object that is defined by the contract

  function makePayments(amountsMatrix) {
    const makePayment = (purseIndex, amount) =>
      purses[purseIndex].withdraw(amount, 'payout');
    return mapArrayOnMatrix(amountsMatrix, makePayment);
  }

  // Escrow does the escrowing, but also updates the `purseQuantities`
  // (the current balance of the purses) and `quantities` (the amount
  // escrowed per player per issuer)
  function escrow(rules, payments) {
    const quantitiesForPlayer = [];
    // has side-effects
    // eslint-disable-next-line array-callback-return
    purses.map(async (purse, i) => {
      // if the user's contractual understanding includes
      // "haveExactly", make sure that they have supplied the
      // coordinating payment
      if (rules[i].rule === 'haveExactly') {
        const amount = await purse.depositExactly(
          rules[i].haveExactly,
          payments[i],
        );
        purseQuantities[i] = strategies[i].with(
          purseQuantities[i],
          amount.quantity,
        );
        quantitiesForPlayer.push[amount.quantity];
      } else {
        quantitiesForPlayer.push[strategies[i].empty()];
      }
    });
    quantities.push(quantitiesForPlayer);
  }

  function initializeRecordkeeping(submittedIssuers) {
    issuers = submittedIssuers;
    // we have a lot of round trips here. TODO: fewer round trips
    assays = issuers.map(issuer => E(issuer).getAssay());
    strategies = issuers.map(issuer => E(issuer).getStrategy());
    purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
    purseQuantities = strategies.map(strategy => strategy.empty());
    quantities = srcs.initQuantities();
    offers = srcs.initOffers();
  }

  function allocate() {
    const reallocation = srcs.reallocate(quantities);
    insist(
      areRightsConserved(reallocation),
    )`Rights are not conserved in the proposed reallocation`;

    const amounts = toAmountMatrix(quantities);
    insist(
      isOfferSafeForAll(assays, offers, amounts),
    )`The proposed reallocation was not offer safe`;

    const payments = makePayments(amounts);
    results.map((result, i) => result.res(payments[i]));
  }

  const institution = harden({
    init(submittedIssuers) {
      insist(sm.canTransitionTo('open'))`could not be opened`;
      insist(srcs.areIssuersValid(submittedIssuers))`issuers are not valid`;
      initializeRecordkeeping(submittedIssuers);
      sm.transitionTo('open');
      return institution;
    },
    getIssuers: _ => harden(issuers),
    async makeOffer(rules, payments) {
      // TODO: handle bad/incorrect behavior by sending back payment.
      // Right now we just keep it.
      const result = makePromise();

      await Promise.all(escrow(rules, payments));

      // fail-fast if the offer isn't valid
      if (!srcs.isValidOffer(issuers, offers, rules, contractData)) {
        return result.reject('offer was invalid');
      }

      // keep the valid offer
      offers.push(rules);
      results.push(result);

      // check if canReallocate whenever a valid offer is made
      if (srcs.canReallocate(offers)) {
        allocate();
      }
      return result.p;
    },
    claim: _ => {},
  });
  return institution;
};
