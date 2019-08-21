# Contracts

## Contract form

```
create(contractSrcs, initialData);
```

1. Offer format
2. Processing of offers
3. Allocation

## Contract Type 1: Swap

### Bid Format 

Someone can create a swap by creating an offer in the following
format:

```js

const contract = { 
  haveExactly: amount1,
  wantExactly: amount2,
};

const goodsToEscrow = {
  haveExactly: amount1Payment,
};

createOffer(contract, goodsToEscrow);
```

  An offer gets *matched* if there exists another offer of the form:

```js

const contract2 = { 
  haveExactly: amount2, 
  wantExactly: amount1,
}

const goodsToEscrow2 = {
  haveExactly: amount2Payment,
};

createOffer(contract2, goodsToEscrow);
```

For an offer to be valid, the offer must include two parts: the
contract which describes the user's understanding of the contractual
arrangement, and the goods to be escrowed. The contract should be
suitable for being an amount, and the goods to be escrowed must be in
the form of actual payments. The goods to be escrowed must be of the
amount described in the contract under "haveExactly". Without it, the
offer is rejected.

### State transitions

The swap starts out with no offers (STATE: OPEN). Once it receives
one offer, it transitions into a new state, (STATE: MATCHING),
looking for a matching state and rejecting everything that is not
matching. In the open state, offers are only rejected if the good
offered does not match the amount. In the matching state, offers are
rejected if the good offered does not match the amount AND if the
offer does not match the starting offer. 

Once a matching offer is found, the state changes to ALLOCATING and
the allocation function is triggered. Once the allocation function
returns a valid allocation that fits the invariants of offer safety
and conservation of goods, the contract state changes to CLOSED and
scooter sends the resultant payments. 

### Transferring seats

When does it make sense to be able to hand over a position in the swap
contract?
1. At MATCHING, when the payment for the seat has already escrowed. 
2. At ALLOCATING when the closing payments haven't yet been sent out. 

## Negotiation

### Bid Format 

Someone can create a negotiation by creating an offer in the following
format:

```js

const contract = { 
  haveExactly: amount1, 
  wantExactly: amount2,
};

createOffer(contract);
```

Counter-offers can be made in the form:

```js

const contract2 = { 
  haveExactly: amount3, 
  wantExactly: amount1,
}

createOffer(contract2);
```

There are a couple of differences in how negotiations work, as opposed
to swaps. A negotiation does not include escrowed amounts in the
initial offer stage, since the negotiation may change significantly
before any actual allocation happens. Additionally, a counteroffer is
by definition, not a matching offer with the original offer. (Does one
side have to remain the same? For instance, does the `wantExactly` of
the counter-offer have to match the `haveExactly` of the original
offer, even though the `haveExactly` of the counter-offer could be a
different issuer and amount entirely?)

### State transitions

OPEN
MATCHING - matching function asks for user feedback as to whether they
accept it or not
ALLOCATING
CLOSED

A negotiation only differs from the swap in the behavior during the
matching state. All other states are the same. 

Is the negotiation open to all?

## AgoricSwap

(ignoring transaction deadlines for now)

Liquidity pool is empty
addLiquidity(paymentAmount1, paymentAmount2, wantExactly/minimumLiquidity)

Offer to a made liquidity pool:

```js
const contract = { 
  haveExactly: amount1,
  wantAtLeast: amount2, // wantAtLeast is optional
};

const goodsToEscrow = {
  haveExactly: amount1Payment,
};

```
Validation is done by the constant product formula

```js
const allocation = (poolState, contract, goodsToEscrow) => {
  const {
    aPoolAmount,
    bPoolAmount,
  } = poolState;

  const {
    haveExactly,
    wantAtLeast, 
  } = contract;

  // check that the issuer of haveExactly is the issuer of aPoolAmount
  // check that the issuer of wantAtLeast is the issuer of bPoolAmount

  const fee = haveExactly / FEE_DIVISOR;
  const invariant = poolBalanceAmount1 * poolBalanceAmount2;
  const newAPoolAmount = aPoolAmount + haveExactly;
  const newBPoolAmount = invariant / (newAPoolAmount - fee);
  const amountOut = bPoolAmount - newBPoolAmount;
  insist(assay.includes(amountOut, wantAtLeast);

  // Note that ERTP would need to be able to do multiplication and division

  return {
    poolState: {
      aPoolAmount: newAPoolAmount,
      bPoolAmount: newBPoolAmount,
    }, 
    amountOut,
  };
}

```

Make the payment to the user.

## Exchange

1. A market order will execute immediately at the current market price. 
2. A stop order lets you specify the price at which the order should be executed and is useful for stop loss and similar strategies.
3. A limit order lets you set your own price, as well as set some
   advanced order execution options.

Market order: 

```js
{ 
 side: buy,
 wantedExactly: amount1,
 haveAtMost: amount2, // the amount to be escrowed, may be partially returned
}

{
  side: sell,
  haveExactly: amount1,
}
```

Market orders don't have any offer safety?

## Second Price Auction (not sealed at this point)

offers might have the form:

```js
{ 
  wantExactly: amount1, // the thing to be auctioned off
  haveExactly: amount2, // the bid (in second price, the true value)
}
```

STATE: OPEN

After a certain amount of time or bids, the state changes to
ALLOCATING, and runs the allocation function. After the allocation
function returns, the state changes to CLOSED.
