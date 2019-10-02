# Assays API

## Amount
Amounts are wrappers on quantities that have been validated by an Assay, and can be verified as having been issued by the Assay. They contain their quantity and a Label. The label identifies a particular issuer.

## Quantity
Quantities describe the extent of something that can be owned or shared. The format is determined by its assay. Fungible quantities are normally represented by natural numbers. Other quantities may be represented as strings naming a particular right, or an arbitrary object that sensibly represents the rights at issue. All Amounts made by the same Assay have the same label. Quantity must be Comparable. (This IDL doesn't yet provide a way to specify subtype relationships for structs.)

## Assay
Creator and validator of asset Amounts.
Amounts are the canonical description of tradable goods. They are manipulated by mints, and represent the goods and currency carried by purses and payments. They can be used to represent things like currency, stock, and the abstract right to participate in a particular exchange.
The assay treats the Label as an opaque object. It's used in the amounts produced by this assay.

### assay.getLabel()
Return this assay's label.

- **Returns:** `{Label}`

- **Usage:**

```js
Examples
```

### assay.make()
Make a new verified Amount containing the `allegedQuantity`.

- `allegedQuantity` `{Quantity}`
- **Returns:** `{Amount}`

- **Usage:**

```js
Examples
```

### assay.coerce()
Is this like an Amount object made by this Assay, such as one received by pass-by-copy from an otherwise-identical remote Amount? If so, return an Amount object made by this Assay. Otherwise error.

For fungible amounts based on natural numbers, coerce also accepts a bare number which it will coerce to a labeled number via assay.make().

- `allegedAmount` `{Amount}`
- **Returns:** `{Amount}`

- **Usage:**

```js
Examples
```

### assay.quantity()
Return a Quantity representing the Amount parameter.

- `amount` `{Amount}`
- **Returns:** `{Quantity}`

- **Usage:**

```js
Examples
```

### assay.empty()
Return an empty amount. Conveys no authority.

- **Returns:** `{Amount}`

- **Usage:**

```js
Examples
```

### assay.isEmpty()
Return true if the Amount is empty. Otherwise false.

- `amount` `{Amount}`
- **Returns:** `{boolean}`

- **Usage:**

```js
Examples
```

### assay.includes()
Returns true if the `leftAmount` contains the `rightAmount`.

- `leftAmount` `{Amount}`
- `rightAmount` `{Amount}`
- **Returns:** `{boolean}`

- **Usage:**

```js
Examples
```

### assay.equals()
Returns true if the leftAmount equals the rightAmount. We assume that if includes is true in both directions, equals is also true.

- `leftAmount` `{Amount}`
- `rightAmount` `{Amount}`
- **Returns:** `{boolean}`

- **Usage:**

```js
Examples
```

### assay.with()
Returns a new amount that includes both leftAmount and rightAmount. For fungible amounts this means adding the quantities. For other kinds of amounts, it usually means including both.

- `leftAmount` `{Amount}`
- `rightAmount` `{Amount}`
- **Returns:** `{Amount}`

- **Usage:**

```js
Examples
```

### assay.without()
Returns a new amount that includes the portion of leftAmount not included in rightAmount. If leftAmount doesn't include rightAmout, throw an error.

- `leftAmount` `{Amount}`
- `rightAmount` `{Amount}`
- **Returns:** `{Amount}`

- **Usage:**

```js
Examples
```

## Label
The label for an amount identifies the issuer, and includes a description of the rights it represents.

Every amount created by the Assay will have the same label, but recipients cannot use the label by itself to verify that a purported amount is authentic, since the label can be copied.

## Description
Human-readable description of a kind of rights. The Descriptions must be Comparables. (This IDL doesn't yet provide a way to specify subtype relationships for structs.)

## UniAssay
UniAssay represents amounts that have unique descriptions. It is a refinement of Assay that we've found useful, but has no special place in the protocol.

The quantity must either be null, in which case it is empty,or be some truthy comparable value, in which case it represents a single unique unit described by that truthy quantity. Combining two uni amounts with different truthy quantities fails, as they represent non-combinable rights.

## NatAssay
Assay for a labeled natural number describing a quantity of fungible erights. The label describes what kinds of rights these are. NatAssay is a refinement of Assay that we've found useful, but has no special place in the protocol.

Empty amounts have zero units. 'includes()' verifies that leftAmount is greater than or equal to rightAmount. 'with()' and 'without()' add and subtract their contents.