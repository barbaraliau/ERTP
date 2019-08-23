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
  // Matrices
  let allocatedPayments; // payments to be distributed per player
  let offers; // rules per player
  let quantities; // quantities per player

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
      const winnings = makePromise();

      insist(sm.canTransitionTo('reallocating'))`could not receive offer`;

      // Check that the offers are backed up with valid payments and
      // escrow the payments.
      await Promise.all(escrow(rules, payments));

      // fail-fast if the offer isn't valid (TODO: reject promise)
      if (!srcs.isValidOffer(issuers, offers, rules, contractData)) {
        return;
      }

      // keep the valid offer
      offers.push(rules);

      // check if canReallocate whenever a valid offer is made
      if (!srcs.canReallocate(offers)) {
        return;
      }

      // we can reallocate
      sm.transitionTo('reallocating');
      const reallocation = srcs.reallocate(quantities);

      // check conservation of rights on quantities only
      insist(
        areRightsConserved(reallocation),
      )`Rights are not conserved in the proposed reallocation`;

      const amounts = toAmountMatrix(quantities);

      // check offer safety on the amounts
      insist(
        isOfferSafeForAll(assays, offers, amounts),
      )`The proposed reallocation was not offer safe`;

      allocatedPayments = makePayments(amounts);

      sm.transitionTo('disperse');
    },
    claim: _ => {},
  });
  return institution;
};
