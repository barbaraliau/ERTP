import Nat from '@agoric/nat';
import harden from '@agoric/harden';

const operations = harden({
  add: (x, y) => Nat(x + y),
  subtract: (x, y) => Nat(x - y),
  mult: (x, y) => Nat(x * y),
  divide: (x, y) => Nat(Math.floor(x / y)),
});

export { operations };
