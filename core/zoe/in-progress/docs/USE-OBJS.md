We need a way of returning an ERTP payment for:
1. the right to enter a zoe contract
2. the right to the outcome of a position in a zoe contract (after
   an offer has been made)

We can easily return objects for these things. However, these objects
can be shared without the authority being revoked from the original
holder. Also, these objects cannot be verified as valid. 

Thus, we need an ERTP payment that if received and deposited:
1. takes the right away from the previous owner. 
2. is verified by the recipient as having the characteristics they
   care about - that it is coming from zoe, the governing contract installed in zoe, the offer
   associated with it. This means that there has to be one zoe
   issuer (?)

The user relies on:
* the code library that stores the swap srcs
* the zoe code
* the zoe issuer
* the particular governing contract installation (swap srcs)

If they receive a payment that represents the outcome of a position
in a zoe, they can therefore ask the zoe issuer
to claim exactly with an amount with a quantity that has:
1. The unique id for the srcs (this is the id for getting the srcs from a
   trusted library)
2. The unique id for the particular instantiation (per src or overall)?
3. the offer that was made

invite: (can hold multiple invites by adding to the array)
```js
quantity = [{
  src: 'swap',
  id: 1,
  offerToBeMade: [rule1, rule2],
}]
```

claim: (can hold multiple claims by adding to the array)
```js
quantity = [{
  src: 'swap',
  id: 1,
  offersMade: [rule1, rule2],
}]
```
