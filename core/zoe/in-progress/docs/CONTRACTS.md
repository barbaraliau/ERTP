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
