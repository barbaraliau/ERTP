# Issuer

## Issuer

Holding an Issuer provides the ability to create amounts and empty purses, but confers no rights. It is also the mechanism used to get exclusive access to a Purse or Payment that you already hold, or to burn some or all of the contained rights.

### issuer.getLabel()
Get the label for this Issuer. Labels can be used to manually construct amounts.

- **Returns:** `{Comparable}` The label for the issuer.

```js
const { description } = issuer.getLabel();
const childMint = makeMint(description, config);
```

### issuer.getAssay()
Get the `Assay` for this Issuer.

- **Returns:** `{Assay}`

```js
const galleryPixelAssay = galleryPixelIssuer.getAssay();
```

After getting the `Assay` of an `Issuer`, `Assay` methods can be called to verify properties of the amount. See the [Assays API](/api/assays) for all available methods.

```js
  insist(!issuer.getAssay().isEmpty(amount))`\
    no use rights present in amount ${amount}`;
}

function insistAssetHasAmount(issuer, asset, amount) {
  insist(issuer.getAssay().includes(asset.getBalance(), amount))`\
    ERTP asset ${asset} does not include amount ${amount}`;
}

function getPixelList(issuer, amount) {
  return issuer.getAssay().quantity(amount);
}
```

### issuer.getStrategy()
Get the Strategy for this Issuer.

- **Returns:** `{Strategy}`

```js
Examples
```
### issuer.makeAmount(quantity)
Make an Amount that contains the indicated quantity.
- `quantity` `{Quantity}`
- **Returns:** `{Amount}`

```js
Examples
```

### issuer.makeEmptyPurse(name)
Make an empty purse associated with this kind of right.

- `name` `{String}`
- **Returns:** `{Purse}`
- **Usage:**

```js
Examples
```

### issuer.makeEmptyPurse(name)
Make an empty purse associated with this kind of right.

- `name` `{String}`
- **Returns:** `{Purse}`
- **Usage:**

```js
Examples
```

### issuer.combine(paymentsArray, name)
Combine multiple payments into one payment.

- `paymentsArray` `{Array <Payment>}` - A list of payments to combine into a new payment
- `name` `{String}` - Name to call this combination of payments
- **Returns:** `{Payment}`
- **Usage:**

```js
Examples
```

### issuer.split(payment, amountsArray)
Split a single payment into multiple payments, according to the amounts and names passed in.

- `payment` `{Payment}`
- `amountsArray` `{Array <Amount>}`
- **Returns:** `{Array <Payment>}`
- **Usage:**

```js
Examples
```

### issuer.claimExactly(amount, src, name)
Make a new Payment that has exclusive rights to all the contents of src. If amount does not equal the balance of the src payment, throws error.

- `amount` `{Amount}`
- `src` `{Payment}`
- `name` `{String}` - name of a new Payment
- **Returns:** `{Payment}`
- **Usage:**

```js
Examples
```

### issuer.claimAll(src, name)
Make a new Payment that has exclusive rights to all the contents of src.

- `src` `{Payment}`
- `name` `{String}` - name of a new Payment
- **Returns:** `{Payment}`
- **Usage:**

```js
Examples
```

### issuer.burnExactly(amount, src)
Burn all of the rights from src. If amount does not equal the balance of the src payment, throw error.

- `amount` `{Amount}`
- `src` `{Payment}`
- **Returns:** `{Amount}`
- **Usage:**

```js
Examples
```

### issuer.burnAll(src)
Burn all of the rights from src.

- `src` `{Payment}`
- **Returns:** `{Amount}`
- **Usage:**

```js
Examples
```


## MintMaker
Makes Mints.

The description becomes part of the label, used by the assay to identify amounts authorized/acknowledged by the mint. The MintController and Assay must be compatible with the type of asset managed by the mint.

Description doesn't have to be a string, but it will only be used for its value.

### mintMaker.makeMint(description, makeConfig)

- `description` `{Comparable}`
- `makeConfig` `{MintConfigMaker}`
- **Returns:** `{Mint}`
- **Usage:**

```js
Examples
```

## Mint
Holding a Mint carries the right to control issuance and destruction of purses and payments containing amounts of a particular currency. Purses (and payments) associated with a particular issuer can only transfer value to others using the same mint.

### mint.getIssuer()
Get the Issuer for this mint.

- **Returns:** `{Issuer}`
- **Usage:**

```js
Examples
```

### mint.mint(initialBalance, name)
Create a new Purse containing the amount. Give it the specified name or 'fa purse'.

- `intialBalance` `{Amount}`
- `name` `{String}` - the name of a Purse
- **Returns:** `{Purse}`
- **Usage:**

```js
Examples
```

## Purse
Purses hold verified amounts of certain rights issued by Mints. Purses can transfer part of the balance they hold in a payment, which has a narrower interface. A purse's balance can rise and fall, through the action of depositExactly() and withdraw(). Operations on payments (`burnExactly()`, `depositExactly()`, `issuer.claimExactly()`) kill the original payment and create new payments if applicable. The primary use for Purses and Payments is for currency-like and goods-like valuables, but they can also be used to represent other kinds of rights, such as the right to participate in a particular contract.

### purse.getName()
Get the name of this purse.

- **Returns:** `{String}`
- **Usage:**

```js
Examples
```

### purse.getIssuer()
# Double check this description, in the `.chainmail` file it says that this method get the issuer for this **mint**
Get the Issuer for this purse.

- **Returns:** `{Issuer}`
- **Usage:**

```js
Examples
```

### purse.getBalance()
Get the amount contained in this purse, confirmed by the issuer.

- **Returns:** `{Amount}`
- **Usage:**

```js
Examples
```

### purse.depositExactly(amount, src)
Deposit all the contents of srcPayment into this purse, returning the amount. If the amount does not equal the balance of srcPayment, throw error.

- `amount` `{Amount}`
- `src` `{Payment}`
- **Returns:** `{Amount}`
- **Usage:**

```js
Examples
```

### purse.depositAll(srcPayment)
Deposit all the contents of srcPayment into this purse, returning the amount.

- `srcPayment` `{Payment}`
- **Returns:** `{Amount}`
- **Usage:**

```js
Examples
```

### purse.withdraw(amount, name)
Withdraw amount from this purse into a new Payment.

- `amount` `{Amount}`
- `name` `{String}`
- **Returns:** `{Payment}`
- **Usage:**

```js
Examples
```

### purse.withdrawAll(name)
Withdraw entire content of this purse into a new Payment.

- `name` `{String}`
- **Returns:** `{Payment}`
- **Usage:**

```js
Examples
```

## Payment
Payments hold verified amounts of certain rights issued by Mints. Amounts from payments can be deposited in purses, but otherwise, the entire amount is available when the payment is transferred. A payment's balance can only fall, through the action of `depositExactly()`, `claimExactly()` or `burnExactly()`. Payments can be converted to Purses by getting a verified issuer and calling `issuer.makeEmptyPurse().depositAll(payment)`;

### payment.getName()
Get the name of this purse.

- **Returns:** `{String}`
- **Usage:**

```js
Examples
```

### payment.getIssuer()
Get the Issuer for this mint.

- **Returns:** `{Issuer}`
- **Usage:**

```js
Examples
```

### payment.getBalance()
Get the amount contained in this payment, confirmed by the issuer.

- **Returns:** `{Amount}`
- **Usage:**

```js
Examples
```

## Strategy
All of the difference in how an assay behaves can be reduced to the behavior of the set operations on quantities (think: arithmetic) such as `empty`, `with`, `without`, `includes`, etc. We extract this custom logic into a strategy. Strategies are about quantity arithmetic, whereas Assays are about Amounts, which are labeled quantities. Assays use Strategies to do their quantity arithmetic, and then label the results, making new Amounts.

### strategy.insistKind(allegedQuantity)
Check the kind of this quantity and throw if it is not the expected kind.

- `allegedQuantity` `{Quantity}`
- **Returns:** `{Quantity}`
- **Usage:**

```js
Examples
```

### strategy.empty()
Get the representation for empty.

- **Returns:** `{Quantity}`
- **Usage:**

```js
Examples
```

### strategy.isEmpty(quantity)
Is the quantity empty?

- `quantity` `{Quantity}`
- **Returns:** `{boolean}`
- **Usage:**

```js
Examples
```

### strategy.includes(whole, part)
Does the whole include the part?

- `whole` `{Quantity}`
- `part` `{Quantity}`
- **Returns:** `{boolean}`
- **Usage:**

```js
Examples
```

### strategy.equals(left, right)
Does left equal right?

- `left` `{Quantity}`
- `right` `{Quantity}`
- **Returns:** `{Quantity}`
- **Usage:**

```js
Examples
```

### strategy.with(left, right)
Return the left combined with the right

- `left` `{Quantity}`
- `right` `{Quantity}`
- **Returns:** `{Quantity}`
- **Usage:**

```js
Examples
```

### strategy.without(whole, part)
Return what remains after removing the part from the whole.

- `whole` `{Quantity}`
- `part` `{Quantity}`
- **Returns:** `{Quantity}`
- **Usage:**

```js
Examples
```
