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
const oneTrue = (prev, curr) => prev || curr;

// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript/41772644#41772644
const transpose = matrix =>
  matrix.reduce(
    (acc, row) => row.map((_, i) => [...(acc[i] || []), row[i]]),
    [],
  );

export { mapMatrix, allTrue, oneTrue, transpose, mapArrayOnMatrix };
