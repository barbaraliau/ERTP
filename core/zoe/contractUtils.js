// These utilities are likely to be helpful to developers writing
// governing contracts.

// used to reduce boolean arrays
const allTrue = (prev, curr) => prev && curr;
const anyTrue = (prev, curr) => prev || curr;

// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript/41772644#41772644
const transpose = matrix =>
  matrix.reduce(
    (acc, row) => row.map((_, i) => [...(acc[i] || []), row[i]]),
    [],
  );

/**
 * @param  {matrix} matrix - array of arrays
 * @param  {function} arrayF - the array of functions to apply
 */
const mapArrayOnMatrix = (matrix, arrayF) => {
  return matrix.map(row => row.map((x, i) => arrayF[i](x, i)));
};

const ruleEqual = (leftRule, rightRule) => leftRule.rule === rightRule.rule;

const amountEqual = (assay, leftRule, rightRule) =>
  assay.equals(leftRule.amount, rightRule.amount);

// Check that two offers are equal in both their rules and their amounts
const offerEqual = (assays, leftOffer, rightOffer) => {
  const isLengthEqual = leftOffer.length === rightOffer.length;
  if (!isLengthEqual) {
    return false;
  }
  return leftOffer
    .map(
      (leftRule, i) =>
        ruleEqual(leftRule, rightOffer[i]) &&
        amountEqual(assays[i], leftRule, rightOffer[i]),
    )
    .reduce(allTrue);
};

// Transform a quantitiesMatrix to a matrix of amounts given an array
// of the associated assays.
const toAmountMatrix = (assays, quantitiesMatrix) => {
  const assayMakes = assays.map(assay => assay.make);
  return mapArrayOnMatrix(quantitiesMatrix, assayMakes);
};

// an array of empty quantities per strategy
const makeEmptyQuantities = strategies =>
  strategies.map(strategy => strategy.empty());

export {
  allTrue,
  anyTrue,
  transpose,
  mapArrayOnMatrix,
  offerEqual,
  toAmountMatrix,
  makeEmptyQuantities,
};