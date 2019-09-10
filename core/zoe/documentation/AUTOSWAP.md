# AutoSwap

An AutoSwap is like a swap, except instead of having to find a
matching offer, you always try to match against the existing pool. The
AutoSwap contract checks whether your offer will keep the constant
product invariant before accepting. 

Based on UniSwap.

Features currently missing:
* liquidity tokens
* timeouts / cancellation

## Initialization

We call `autoswap.init(issuers)` to initialize the contract. There
must be two issuers in the `issuers` array representing two issuers whose
assets we want to swap. Let's say that we want to
trade moola for simoleans:

```js
const issuers = [moolaIssuer, simoleansIssuer];
```

## Adding liquidity to the pool
Liquidity can be added to the pool by making an offer of the following
format. 

Note: it may seem strange to try to make adding liquidity an offer. It
is strange, but it also allows us to reuse zoe without having
customize further. It remains to be seen which choice we should make
in this tradeoff.

```js
const rules = [
  { 
    rule: 'haveExactly',
    amount: bucks500,
  },
  { 
    rule: 'haveExactly',
    amount: quatloos700,
  },
  {
    rule: 'wantExactly',
    amount: liquidityX,
  }
];

const payments = [ bucks500Payment, quatloos700Payment, undefined];

autoswap.makeOffer(rules, payments);
```
The last argument is optional. If not specified, it should be replaced
with undefined so that the array length is still 3. If it is
unspecified, zoe will not be able to enforce offer safety for the
players adding to the liquidity pool. 

## Making a swap offer

To use the Autoswap, a user submits an offer like:

```js
const rules = [
  {
    rule: 'haveExactly',
    amount: bucks3,
  },
  {
    rule: 'wantAtLeast',
    amount: quatloos7,
  }
  undefined,
];

const payments = [bucks3Payment, undefined, undefined];
```
The `wantAtLeast` rule is optional. If not specified it should be
replaced with undefined. If not specified, zoe will not be able to
enforce offer safety. 

## Validating a swap offer

Validation is done by the constant product formula.
