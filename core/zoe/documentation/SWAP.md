# Swap

If I want to trade one kind of asset for another kind, I could send
you the asset and ask you to send me the other kind back. But, you
could choose to behave opportunistically: receive my asset and give
nothing back. To solve this problem, the Swap contract allows users to
securely trade one kind of eright for another kind, leveraging Zoe
for escrow and offer-safety. At no time does any user have the
opportunity to behave opportunistically.

## Bid Format 

Someone can create a swap by initializing it with an array of issuers,
(essentially saying that they want to exchange something of the brand
issuer1 with the brand issuer2), as well as an offer and the payments
for that offer:

```js
swap.init([moolaIssuer, bucksIssuer], initialOffer, paymentsForOffer);
```

The `initialOffer` is an array of "rules" per issuer. For instance,
maybe the first player has 3 moola to offer and wants 5 bucks in
return. If they don't know how to structure the rules because they
don't know the order of the issuers, they can call `getIssuers` on the
swap object to get the array of issuers. 

A swap offer by definition has a rules array of length 2, which must
have one rule `haveExactly`, and the other rule must be `wantExactly`.
The order of these rules doesn't matter, as long as the order matches
the order of the issuers. The accompanying `paymentsForOffer` array
must contain an ERTP payment in the index matching the index of the
`haveExactly` rule. The `wantExactly` rule is used to find a matching
rule and enforce offer safety.

```js

const initialOffer = [ 
  { rule: 'haveExactly', 
    amount: moola3, 
  }, 
  { rule: 'wantExactly',
    amount: bucks5
  }, 
];

const paymentsForOffer = [
  moola3Payment,
  undefined, // leave the payment in the 'wantExactly' slot as undefined
];
```

The initial user (let's call them player1) then receives an object
with two properties: `seat` and `invites`. `seat` is their own seat at
the contract; `invites` is an array of ERTP payments that represent
invites to make an offer. These invites can be sent to other people to
invite them to participate. 

In a swap, there are only two seats: the one created by player1 and an
additional one that is the opposite position in the swap. Let's say
that player1 takes the `invite` they received in `invites` and gives
it to player2. Now player2 can examine the invite with the utility
`offerEqual` and make sure the offer matches their expectations:

```js
offerEqual(
  [moolaAssay, bucksAssay],
  invitePayment.getBalance().quantity.offerToBeMade,
  intendedOffer,
);
```

If the invite is to player2's liking, they can unwrap the invite and
make an offer:

```js
const player2invite = await invitePayment.unwrap();
const payments = [moolaPayment, bucksPayment];

const seatPayment = await player2invite.makeOffer(
  intendedOffer
  payments,
);
```
For an offer to be valid, the offer must include two parts: the rules
which describe the user's understanding of the contractual
arrangement, and the payments to be escrowed. The rules should be
declarative and suitable for being an amount. The goods to be escrowed
must be of the amount described in the contract under `haveExactly`.
Without it, the offer is rejected.

Making an offer results in a seat payment which represents the right
to claim the outcome of that seat. The payment, when unwrapped, has a
use object that has two methods: `claim` and `cancel`.

`cancel` cancels the contract for everyone and gives everyone a refund
when they call `claim`. (If you are the person who calls cancel, you
get your refund as the return value).

Calling `claim` attempts to do the reallocation and returns a promise
for when the reallocation is done. `claim` can be called repeatedly.
