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
4. `isValidOffer`: a function that takes in  (issuers, assays,
   offersSoFar, newOffer, quantities) and returns a boolean. This is
   meant to test whether `newOffer` is valid. Will probably be
   rearranging the order of the parameters. 
5. `canReallocate`: a function that takes in an offers array of valid
   offers and asks if we can trigger the reallocation
6. `reallocate`: a function that takes in a matrix of quantities per
   player (the rows) per issuer (the columns) and returns a matrix
   formatting in the same way, with altered quantities
7. `cancel`: a function that takes in the same kind of matrix as
   reallocate, and returns a matrix in the same format. 
