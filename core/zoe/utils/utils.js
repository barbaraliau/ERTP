/**
 * @param  {matrix} matrix - array of arrays
 * @param  {function} f - the function to apply
 */
const mapMatrix = (matrix, f) => {
  return matrix.map(row => row.map(f));
};
/**
 * @param  {matrix} matrix - array of arrays
 * @param  {function} arrayF - the array of functions to apply
 */
const mapArrayOnMatrix = (matrix, arrayF) => {
  return matrix.map(row => row.map((x, i) => arrayF[i](x, i)));
};

// used to reduce boolean arrays
const allTrue = (prev, curr) => prev && curr;
const anyTrue = (prev, curr) => prev || curr;

// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript/41772644#41772644
const transpose = matrix =>
  matrix.reduce(
    (acc, row) => row.map((_, i) => [...(acc[i] || []), row[i]]),
    [],
  );

const makeHasOkLength = length => arr => arr.length === length;

// validRules is an array of arrays where each row is the rules of a valid offer:
// e.g. validRules = [['haveExactly', 'wantExactly'],
// ['wantExactly', 'haveExactly']]
const makeHasOkRules = validRules => offer =>
  validRules.map((rules, i) => rules[i] === offer[i].rule).reduce(anyTrue);

const hasOkIssuers = (issuers, offer) =>
  issuers
    .map((issuer, i) => offer[i].amount.label.issuer === issuer)
    .reduce(allTrue);

const ruleEqual = (leftRule, rightRule) => leftRule.rule === rightRule.rule;

const amountEqual = (assay, leftRule, rightRule) =>
  assay.equals(leftRule.amount, rightRule.amount);

const offerEqual = (assays, leftOffer, rightOffer) => {
  const isLengthEqual = leftOffer.length === rightOffer.length;
  if (!isLengthEqual) {
    return false;
  }
  return leftOffer
    .map((leftRule, i) => {
      return (
        ruleEqual(leftRule, rightOffer[i]) &&
        amountEqual(assays[i], leftRule, rightOffer[i])
      );
    })
    .reduce(allTrue);
};

const allAmountsEqual = (assays, leftRules, rightRules) =>
  assays
    .map((assay, i) => assay.equals(leftRules[i].amount, rightRules[i].amount))
    .reduce(allTrue);

export {
  mapMatrix,
  allTrue,
  anyTrue,
  transpose,
  mapArrayOnMatrix,
  makeHasOkLength,
  makeHasOkRules,
  hasOkIssuers,
  ruleEqual,
  amountEqual,
  allAmountsEqual,
  offerEqual,
};
