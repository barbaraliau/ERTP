# Issuer

## Issuer

Holding an Issuer provides the ability to create amounts and empty purses, but confers no rights. It is also the mechanism used to get exclusive access to a Purse or Payment that you already hold, or to burn some or all of the contained rights.

### issuer.getLabel()
Get the label for this Issuer. Labels can be used to manually construct amounts.

- Returns: `{Comparable}` The label for the issuer.

```js
const { description } = issuer.getLabel();
const childMint = makeMint(description, config);
```
### issuer.getAssay
Get the `Assay` for this Issuer.

- **Arguments:**
  - None

- **Returns:**
  - `{Assay}`

- **Usage:**

```js
const galleryPixelAssay = galleryPixelIssuer.getAssay();
```

After getting the `Assay` of an `Issuer`, `Assay` methods can be called to verify properties of the amount. See the [Assays API](/api/assays) for all available methods.

```js
function insistNonEmptyAmount(issuer, amount) {
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

### issuer.getStrategy
Get the Strategy for this Issuer.

- **Arguments:**
  - None

- **Returns:**
  - `{Strategy}`

- **Usage:**

```js
Examples
```
### issuer.makeAmount
Make an Amount that contains the indicated quantity.

- **Arguments:**
  - `quantity` {Quantity}

- **Returns:**
  - `{Amount}`

- **Usage:**

```js
Examples
```
### issuer.makeEmptyPurse
Make an empty purse associated with this kind of right.

- **Arguments:**
  - `name` {String}

- **Returns:**
  - `{Purse}`

- **Usage:**

```js
Examples
```
### issuer.combine
Combine multiple payments into one payment.

- **Arguments:**
  - `paymentsArray` {Array <Payment>} - A list of payments to combine into a new payment
  - `name` {String} - Name to call this combination of payments

- **Returns:**
  - `{Payment}`

- **Usage:**

```js
Examples
```
### issuer.split
Split a single payment into multiple payments, according to the amounts and names passed in.

- **Arguments:**
  - `payment` {Payment}
  - `amountsArray` {Array <Amount>}

- **Returns:**
  - `{Array <Payment>}`

- **Usage:**

```js
Examples
```
### issuer.claimExactly
Make a new Payment that has exclusive rights to all the contents of src. If amount does not equal the balance of the src payment, throws error.

- **Arguments:**
  - `amount` {Amount}
  - `src` {Payment}
  - `name` {String} - name of a new Payment

- **Returns:**
  - `{Payment}`

- **Usage:**

```js
Examples
```
### issuer.claimAll
Make a new Payment that has exclusive rights to all the contents of src.

- **Arguments:**
  - `src` {Payment}
  - `name` {String} - name of a new Payment

- **Returns:**
  - `{Payment}`

- **Usage:**

```js
Examples
```
### issuer.burnExactly
Burn all of the rights from src. If amount does not equal the balance of the src payment, throw error.

- **Arguments:**
  - `amount` {Amount}
  - `src` {Payment}

- **Returns:**
  - `{Amount}`

- **Usage:**

```js
Examples
```
### issuer.burnAll
Burn all of the rights from src.

- **Arguments:**
  - `src` {Payment}

- **Returns:**
  - `{Amount}`

- **Usage:**

```js
Examples
```
## MintMaker
Makes Mints.

The description becomes part of the label, used by the assay to identify amounts authorized/acknowledged by the mint. The MintController and Assay must be compatible with the type of asset managed by the mint.

Description doesn't have to be a string, but it will only be used for its value.

### mintMaker.makeMint

- **Arguments:**
  - `description` {Comparable}
  - `makeConfig` {MintConfigMaker}

- **Returns:**
  - `{Mint}`

- **Usage:**

```js
Examples
```

## Mint
Holding a Mint carries the right to control issuance and destruction of purses and payments containing amounts of a particular currency. Purses (and payments) associated with a particular issuer can only transfer value to others using the same mint.

### mint.getIssuer
Get the Issuer for this mint.

- **Arguments:**
  - None

- **Returns:**
  - `{Issuer}`

- **Usage:**

```js
Examples
```

### mint.mint
Create a new Purse containing the amount. Give it the specified name or 'fa purse'.

- **Arguments:**
  - `intialBalance` {Amount}
  - `name` {String} - the name of a Purse

- **Returns:**
  - `{Purse}`

- **Usage:**

```js
Examples
```

## Purse
Purses hold verified amounts of certain rights issued by Mints. Purses can transfer part of the balance they hold in a payment, which has a narrower interface. A purse's balance can rise and fall, through the action of depositExactly() and withdraw(). Operations on payments (`burnExactly()`, `depositExactly()`, `issuer.claimExactly()`) kill the original payment and create new payments if applicable. The primary use for Purses and Payments is for currency-like and goods-like valuables, but they can also be used to represent other kinds of rights, such as the right to participate in a particular contract.

### purse.getName
Get the name of this purse.

- **Arguments:**
  - None

- **Returns:**
  - `{String}`

- **Usage:**

```js
Examples
```

### purse.getIssuer
# Double check this description, in the `.chainmail` file it says that this method get the issuer for this **mint**
Get the Issuer for this purse.

- **Arguments:**
  - None

- **Returns:**
  - `{Issuer}`

- **Usage:**

```js
Examples
```

### purse.getBalance
Get the amount contained in this purse, confirmed by the issuer.

- **Arguments:**
  - None

- **Returns:**
  - `{Amount}`

- **Usage:**

```js
Examples
```

### purse.depositExactly
Deposit all the contents of srcPayment into this purse, returning the amount. If the amount does not equal the balance of srcPayment, throw error.

- **Arguments:**
  - `amount` {Amount}
  - `src` {Payment}

- **Returns:**
  - `{Amount}`

- **Usage:**

```js
Examples
```

### purse.depositAll
Deposit all the contents of srcPayment into this purse, returning the amount.

- **Arguments:**
  - `srcPayment` {Payment}

- **Returns:**
  - `{Amount}`

- **Usage:**

```js
Examples
```

### purse.withdraw
Withdraw amount from this purse into a new Payment.

- **Arguments:**
  - `amount` {Amount}
  - `name` {String}

- **Returns:**
  - `{Payment}`

- **Usage:**

```js
Examples
```

### purse.withdrawAll
Withdraw entire content of this purse into a new Payment.

- **Arguments:**
  - `name` {String}

- **Returns:**
  - `{Payment}`

- **Usage:**

```js
Examples
```

## Payment
Payments hold verified amounts of certain rights issued by Mints. Amounts from payments can be deposited in purses, but otherwise, the entire amount is available when the payment is transferred. A payment's balance can only fall, through the action of `depositExactly()`, `claimExactly()` or `burnExactly()`. Payments can be converted to Purses by getting a verified issuer and calling `issuer.makeEmptyPurse().depositAll(payment)`;

### payment.getName
Get the name of this purse.

- **Arguments:**
  - None

- **Returns:**
  - `{String}`

- **Usage:**

```js
Examples
```

### payment.getIssuer
Get the Issuer for this mint.

- **Arguments:**
  - None

- **Returns:**
  - `{Issuer}`

- **Usage:**

```js
Examples
```

### payment.getBalance
Get the amount contained in this payment, confirmed by the issuer.

- **Arguments:**
  - None

- **Returns:**
  - `{Amount}`

- **Usage:**

```js
Examples
```

## Strategy
All of the difference in how an assay behaves can be reduced to the behavior of the set operations on quantities (think: arithmetic) such as `empty`, `with`, `without`, `includes`, etc. We extract this custom logic into a strategy. Strategies are about quantity arithmetic, whereas Assays are about Amounts, which are labeled quantities. Assays use Strategies to do their quantity arithmetic, and then label the results, making new Amounts.

### strategy.insistKind
Check the kind of this quantity and throw if it is not the expected kind.

- **Arguments:**
  - `allegedQuantity` {Quantity}

- **Returns:**
  - `{Quantity}`

- **Usage:**

```js
Examples
```

### strategy.empty
Get the representation for empty.

- **Arguments:**
  - None

- **Returns:**
  - `{Quantity}`

- **Usage:**

```js
Examples
```

### strategy.isEmpty
Is the quantity empty?

- **Arguments:**
  - `quantity` {Quantity}

- **Returns:**
  - `{boolean}`

- **Usage:**

```js
Examples
```

### strategy.includes
Does the whole include the part?

- **Arguments:**
  - `whole` {Quantity}
  - `part` {Quantity}

- **Returns:**
  - `{boolean}`

- **Usage:**

```js
Examples
```

### strategy.equals
Does left equal right?

- **Arguments:**
  - `left` {Quantity}
  - `right` {Quantity}

- **Returns:**
  - `{Quantity}`

- **Usage:**

```js
Examples
```

### strategy.with
Return the left combined with the right

- **Arguments:**
  - `left` {Quantity}
  - `right` {Quantity}

- **Returns:**
  - `{Quantity}`

- **Usage:**

```js
Examples
```

### strategy.without
Return what remains after removing the part from the whole.

- **Arguments:**
  - `whole` {Quantity}
  - `part` {Quantity}

- **Returns:**
  - `{Quantity}`

- **Usage:**

```js
Examples
```