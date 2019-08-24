import { test } from 'tape-promise/tape';

import { makeStateMachine } from '../../../../core/scooter/stateMachine';

import {
  allTrue,
  mapMatrix,
  transpose,
  mapArrayOnMatrix,
} from '../../../../core/scooter/utils';

test('stateMachine', t => {
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

test('allTrue', t => {
  try {
    t.ok([1, 2].reduce(allTrue));
    t.notOk([false, 2].reduce(allTrue));
    t.notOk([false, false].reduce(allTrue));
    t.ok([true, true].reduce(allTrue));
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mapMatrix', t => {
  try {
    const times2 = x => x * 2;
    t.deepEquals(mapMatrix([[1, 2], [3, 4]], times2), [[2, 4], [6, 8]]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('transpose', t => {
  try {
    t.deepEquals(transpose([[1, 2, 3], [4, 5, 6]]), [[1, 4], [2, 5], [3, 6]]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});

test('mapArrayOnMatrix', t => {
  try {
    const add1 = x => x + 1;
    const add2 = x => x + 2;
    const times2 = x => x * 2;
    const functions = [add1, add2, times2];
    t.deepEquals(mapArrayOnMatrix([[1, 2, 3], [4, 5, 6]], functions), [
      [2, 4, 6],
      [5, 7, 12],
    ]);
  } catch (e) {
    t.assert(false, e);
  } finally {
    t.end();
  }
});
