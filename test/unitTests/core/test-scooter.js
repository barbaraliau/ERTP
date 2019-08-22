import { test } from 'tape-promise/tape';

import { makeStateMachine } from '../../../core/scooter/stateMachine';

test.only('stateMachine', t => {
  try {
    const startState = 'empty';
    const allowedTransitions = [
      ['empty', ['open']],
      ['open', ['rellocating', 'cancelled']],
      ['reallocating', ['dispersing']],
      ['dispersing', ['closed']],
      ['cancelled', []],
      ['closed', []],
    ];
    const stateMachine = makeStateMachine(startState, allowedTransitions);
    t.equal(stateMachine.getState(), 'empty');
    t.ok(stateMachine.canTransitionTo('open'));
    t.notOk(stateMachine.canTransitionTo('closed'));
    stateMachine.transitionTo('open');
    t.equal(stateMachine.getState(), 'open');
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
