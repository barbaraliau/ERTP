import harden from '@agoric/harden';

import { insist } from '../../util/insist';

const makeStateMachine = () => {
  let state = 'empty';
  const stateMachine = harden({
    canOpen: _ => state === 'empty',
    open: _ => {
      insist(stateMachine.canOpen())`state ${state} is not empty`;
      state = 'open';
    },
    canAllocate: _ => state === 'open',
    allocate: () => {
      insist(stateMachine.canAllocate())`state ${state} is not open`;
      state = 'allocating';
    },
    canCancel: _ => state === 'open',
    cancel: () => {
      insist(stateMachine.canCancel())`state ${state} is not open`;
      state = 'cancelled';
    },
    canDisperse: _ => state === 'allocating',
    disperse: () => {
      insist(stateMachine.canDisperse())`state ${state} is not allocating`;
      state = 'dispersing';
    },
    canClose: _ => state === 'dispersing',
    close: () => {
      insist(stateMachine.canClose())`state ${state} is not dispersing`;
      state = 'closed';
    },
    getState: _ => state,
  });
};

const makeInitialState = (strategies, players) => {
  // make an array per player of empty quantities per issuer/strategy
  return players.map(_ => strategies.map(strategy => strategy.empty()));
};

const makeInstitution = srcs => {
  const stateMachine = makeStateMachine();

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

  const institution = harden({
    init(submittedIssuers) {
      insist(stateMachine.canOpen())`could not be opened`;
      insist(srcs.areIssuersValid(submittedIssuers))`issuers are not valid`;
      issuers = submittedIssuers;

      // we have a lot of round trips here. TODO: fewer round trips
      assays = issuers.map(issuer => E(issuer).getAssay());
      strategies = issuers.map(issuer => E(issuer).getStrategy());
      purses = issuers.map(issuer => E(issuer).makeEmptyPurse());
      purseQuantities = strategies.map(strategy => strategy.empty());

      quantities = srcs.initQuantities();
      offers = srcs.initOffers();

      stateMachine.open();
      return institution;
    },
    getIssuers: _ => harden(issuers),
    async makeOffer(rules, payments) {
      // TODO: maybe handle bad/incorrect behavior by sending back payment
      // Right now we just keep it.
      insist(stateMachine.canAllocate())`could not receive offer`;

      // Check that the offers are backed up with valid payments and
      // escrow the payments.
      await Promise.all(escrow(rules, payments));

      // additionally check that rules are valid for this particular
      // contract
      if (srcs.isValidOffer(data, issuers, offers, rules)) {
        offers.push(rules);
        quantities.push(strategies.map(strategy => strategy.empty()));

        // check if canAllocate whenever a valid offer is made
        if (srcs.canAllocate(offers)) {
          stateMachine.allocate();
          const reallocation = srcs.allocate(quantities);

          // check conservation of rights on quantities only
          insistRightsConserved(reallocation);

          const amounts = makeAmounts(quantities);

          // check offer safety
          insistOfferSafety(amounts);

          payments = makePayments(amounts);

          stateMachine.disperse();
        }
      }
    },
    claim()
  });
  return institution;
};
