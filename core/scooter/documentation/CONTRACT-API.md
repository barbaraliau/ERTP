# Contract API [WIP, to be changed probably soon]

A governing contract is an object with the methods:

1. `startState`: a string that represents the starting state for the
   state machine, i.e. 'empty'
2. `allowedTransitions`: an array of arrays to be turned into a Map that
   represents the allowed transitions from old state to new state in
   the state machine, i.e. 

```js
[
  ['empty', ['open']],
  ['open', ['reallocating', 'cancelled']],
  ['reallocating', ['closed']],
  ['cancelled', []],
  ['closed', []],
]
```

3. `areIssuersValid`: a function that takes in an array of issuers and
   returns a boolean
4. `isValidOffer`: a function that takes in  `(issuers, assays,
   offersSoFar, newOffer, quantities)` and returns a boolean. This is
   meant to test whether `newOffer` is valid. Will probably be
   rearranging the order of the parameters. 
5. `canReallocate`: a function that takes in an offers array of valid
   offers and asks if we can trigger the reallocation
6. `reallocate`: a function that takes in a matrix of quantities per
   player (the rows) per issuer (the columns) and returns a matrix
   formatting in the same way, with altered quantities
7. `cancel`: a function that takes in the same kind of matrix as
   reallocate, and returns a matrix in the same format. 


The quantities matrix that is passed in to reallocate and cancel looks
like this (the number of players and issuers are variable and could be
anything):

[
  [quantity1, quantity2], // one row per player
  [quantity3, quantity4],
]

`quantity1` and `quantity2` are the quantities for player1. `quantity3`
and `quantity4` are the quantities for player2. The quantities in the
first column (`quantity1`, `quantity3`) are for issuer1, and
quantities in the second column (`quantity2`, `quantity4`) are
for issuer2. 

For examples, see [swap](../contracts/swap.js) and
[autoswap](../contracts/autoswap/autoswap.js) (the Uniswap implemenation)
