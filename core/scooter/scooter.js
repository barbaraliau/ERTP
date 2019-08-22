import harden from '@agoric/harden';

import { insist } from '../../util/insist';
import { makeStateMachine } from './stateMachine';

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

  const bothTrue = (prev, curr) => prev && curr;

  function makePayment(purseIndex, amount) {
    return purses[purseIndex].withdraw(amount, 'payout');
  }

  function makePayments(amounts) {
    return amounts.map(amountForPlayer => amountForPlayer.map(makePayment));
  }

  // https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript/41772644#41772644
  const transpose = matrix =>
    matrix.reduce(
      (acc, row) => row.map((_, i) => [...(acc[i] || []), row[i]]),
      [],
    );

  function insistRightsConserved(allocation) {
    const transposedAllocation = transpose(allocation);
    const totals = transposedAllocation.map((quantitiesPerIssuer, i) => {
      return quantitiesPerIssuer.reduce(strategies[i].with);
    });
    totals.map((total, i) =>
      insist(strategies[i].equals(total, purseQuantities[i])),
    );
  }

  // allocationForPlayer is an array of quantities in the same order
  // as the rules array. That is, the same index refers to quantities
  // and rules for the same issuer.
  function isOfferSafe(rulesForPlayer, amountsForPlayer) {
    const refundOkArray = [];
    const winningsOkArray = [];

    // has side-effects
    // eslint-disable-next-line array-callback-return
    rulesForPlayer.map((rule, i) => {
      const allocatedAmount = amountsForPlayer[i];
      if (rule.rule === 'haveExactly') {
        refundOkArray.push(assays[i].includes(allocatedAmount), rule.amount);
        winningsOkArray.push(true);
      }
      if (rule.rule === 'wantExactly') {
        winningsOkArray.push(assays[i].includes(allocatedAmount), rule.amount);
        refundOkArray.push(true);
      }
    });
    const refundOk = refundOkArray.reduce(bothTrue);
    const winningsOk = winningsOkArray.reduce(bothTrue);

    return refundOk || winningsOk;
  }

  function insistOfferSafety(amounts) {
    const offerSafeArray = offers.map((rulesForPlayer, i) => {
      return isOfferSafe(rulesForPlayer, amounts[i]);
    });
    const offerSafe = offerSafeArray.reduce(bothTrue);
    insist(offerSafe)`Allocation was not "offer-safe"`;
  }

  function makeAmounts(allocatedQuantities) {
    return allocatedQuantities.map(quantitiesForPlayer =>
      quantitiesForPlayer.map((quantity, i) => assays[i].make(quantity)),
    );
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
      if (Object.prototype.hasOwnProperty.call(rules[i], 'haveExactly')) {
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

      insist(sm.canTransitionTo('reallocating'))`could not receive offer`;

      // Check that the offers are backed up with valid payments and
      // escrow the payments.
      await Promise.all(escrow(rules, payments));

      // fail-fast if the offer isn't valid (TODO: reject promise)
      if (!srcs.isValidOffer(contractData, issuers, offers, rules)) {
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
      insistRightsConserved(reallocation);

      const amounts = makeAmounts(quantities);

      // check offer safety on the amounts
      insistOfferSafety(amounts);

      allocatedPayments = makePayments(amounts);

      sm.transitionTo('disperse');
    },
    claim: _ => {},
  });
  return institution;
};
