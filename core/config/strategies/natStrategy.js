import Nat from '@agoric/nat';
import harden from '@agoric/harden';

// The default kind of amount is a labeled natural number describing a
// quantity of fungible erights. The label describes what kinds of
// rights these are. This is a form of labeled unit, as in unit
// typing.

// Natural numbers are used for fungible erights such as money because
// rounding issues make floats problematic. All operations should be
// done with the smallest whole unit such that the NatAssay never
// deals with fractional parts.

const natStrategy = harden({
  insistKind: Nat,
  empty: _ => 0,
  isEmpty: nat => nat === 0,
  includes: (whole, part) => whole >= part,
  equals: (left, right) => left === right,
  with: (left, right) => Nat(left + right),
  without: (whole, part) => Nat(whole - part),
});

export { natStrategy };
