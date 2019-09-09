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
it to player2. Now player2 can examine the invite and make it it
matches their expectations:



-----


Another user can enter the contract if their rules for the contract
*match* the rules specified by the first user:
```js

const player2Rules = [ 
  { rule: 'wantExactly',
    amount: moola3,
  },
  { rule: 'haveExactly',
    amount: bucks5,
  }, 
];

const player2Payments = [
  undefined,
  bucks5Payment, 
];

swap.makeOffer(player2Rules, player2Payments);
```

For an offer to be valid, the offer must include two parts: the rules
which describe the user's understanding of the contractual
arrangement, and the payments to be escrowed. The rules should be
declarative and suitable for being an amount. The goods to be escrowed
must be of the amount described in the contract under `haveExactly`.
Without it, the offer is rejected.

### State transitions

Before creation, the swap is EMPTY. Once swap.init() is called with an
array of issuers, the state changes to OPEN and accepts offers. Before
any offers are received, offers are rejected if the good offered does
not match the amount and if the issuers of the rules and payments do
not match the expected issuers. After an offer is received, additional
offers are rejected if the offer does not additionally match the
starting offer. 

Once a matching offer is found, the state changes to ALLOCATING and
the allocation function is triggered. Once the allocation function
returns a valid allocation that fits the invariants of offer safety
and conservation of goods, the contract state changes to CLOSED and
scooter sends the resultant payments. 

### Transferring seats

When does it make sense to be able to hand over a position in the swap
contract?
1. At OPEN, when the payment for the seat has already escrowed.

In this version, anyone can make a swap offer since we require escrow.
