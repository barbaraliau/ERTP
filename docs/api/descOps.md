# DescOps API

## AssetDesc
AssetDescs are wrappers on extents that have been validated by a DescOps, and can be verified as having been issued by the DescOps. They contain their extent and a Label. The label identifies a particular assay.

## Extent
Extents describe the extent of something that can be owned or shared. The format is determined by its descOps. Fungible extents are normally represented by natural numbers. Other extents may be represented as strings naming a particular right, or an arbitrary object that sensibly represents the rights at issue. All AssetDescs made by the same DescOps have the same label. Extent must be Comparable. (This IDL doesn't yet provide a way to specify subtype relationships for structs.)

## DescOps
Creator and validator of asset AssetDescs.
AssetDescs are the canonical description of tradable goods. They are manipulated by mints, and represent the goods and currency carried by purses and payments. They can be used to represent things like currency, stock, and the abstract right to participate in a particular exchange.
The descOps treats the Label as an opaque object. It's used in the assetDescs produced by this descOps.

### descOps.getLabel()
Return this descOps's label.

- **Returns:** `{Label}`

- **Usage:**

```js
Examples
```

### descOps.make()
Make a new verified AssetDesc containing the `allegedExtent`.

- `allegedExtent` `{Extent}`
- **Returns:** `{AssetDesc}`

- **Usage:**

```js
Examples
```

### descOps.coerce()
Is this like an AssetDesc object made by this DescOps, such as one received by pass-by-copy from an otherwise-identical remote AssetDesc? If so, return an AssetDesc object made by this DescOps. Otherwise error.

For fungible assetDescs based on natural numbers, coerce also accepts a bare number which it will coerce to a labeled number via descOps.make().

- `allegedAssetDesc` `{AssetDesc}`
- **Returns:** `{AssetDesc}`

- **Usage:**

```js
Examples
```

### descOps.extent()
Return an Extent representing the AssetDesc parameter.

- `assetDesc` `{AssetDesc}`
- **Returns:** `{Extent}`

- **Usage:**

```js
Examples
```

### descOps.empty()
Return an empty assetDesc. Conveys no authority.

- **Returns:** `{AssetDesc}`

- **Usage:**

```js
Examples
```

### descOps.isEmpty()
Return true if the AssetDesc is empty. Otherwise false.

- `assetDesc` `{AssetDesc}`
- **Returns:** `{boolean}`

- **Usage:**

```js
Examples
```

### descOps.includes()
Returns true if the `leftAssetDesc` contains the `rightAssetDesc`.

- `leftAssetDesc` `{AssetDesc}`
- `rightAssetDesc` `{AssetDesc}`
- **Returns:** `{boolean}`

- **Usage:**

```js
Examples
```

### descOps.equals()
Returns true if the leftAssetDesc equals the rightAssetDesc. We assume that if includes is true in both directions, equals is also true.

- `leftAssetDesc` `{AssetDesc}`
- `rightAssetDesc` `{AssetDesc}`
- **Returns:** `{boolean}`

- **Usage:**

```js
Examples
```

### descOps.with()
Returns a new assetDesc that includes both leftAssetDesc and rightAssetDesc. For fungible assetDescs this means adding the extents. For other kinds of assetDescs, it usually means including both.

- `leftAssetDesc` `{AssetDesc}`
- `rightAssetDesc` `{AssetDesc}`
- **Returns:** `{AssetDesc}`

- **Usage:**

```js
Examples
```

### descOps.without()
Returns a new assetDesc that includes the portion of leftAssetDesc not included in rightAssetDesc. If leftAssetDesc doesn't include rightAmout, throw an error.

- `leftAssetDesc` `{AssetDesc}`
- `rightAssetDesc` `{AssetDesc}`
- **Returns:** `{AssetDesc}`

- **Usage:**

```js
Examples
```

## Label
The label for an assetDesc identifies the assay, and includes a description of the rights it represents.

Every assetDesc created by the DescOps will have the same label, but recipients cannot use the label by itself to verify that a purported assetDesc is authentic, since the label can be copied.

## Description
Human-readable description of a kind of rights. The Descriptions must be Comparables. (This IDL doesn't yet provide a way to specify subtype relationships for structs.)

## UniDescOps
UniDescOps represents assetDescs that have unique descriptions. It is a refinement of DescOps that we've found useful, but has no special place in the protocol.

<!-- The extent must either be null, in which case it is empty,or be some truthy comparable value, in which case it represents a single unique unit described by that truthy quantity. Combining two uni assetDescs with different truthy quantities fails, as they represent non-combinable rights. -->
The extent must either be null, in which case it is empty,or be some truthy comparable value, in which case it represents a single unique unit described by that truthy extent. Combining two uni assetDescs with different truthy extents fails, as they represent non-combinable rights.

## NatDescOps
DescOps for a labeled natural number describing a extent of fungible erights. The label describes what kinds of rights these are. NatDescOps is a refinement of DescOps that we've found useful, but has no special place in the protocol.

Empty assetDescs have zero units. 'includes()' verifies that leftAssetDesc is greater than or equal to rightAssetDesc. 'with()' and 'without()' add and subtract their contents.