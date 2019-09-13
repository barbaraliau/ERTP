import { operations } from './operations';

const { add, subtract, mult, divide } = operations;

// calculate the fee, quantity out, new pool quantities
// Q stands for Quantity
const calcSwap = (tokenInPoolQ, tokenOutPoolQ, tokenInQ) => {
  const feeDivisor = 500;
  const feeTokenInQ = divide(tokenInQ, feeDivisor);
  const invariant = mult(tokenInPoolQ, tokenOutPoolQ);
  const newTokenInPoolQ = add(tokenInPoolQ, tokenInQ);
  const newTokenOutPoolQ = divide(
    invariant,
    subtract(newTokenInPoolQ, feeTokenInQ),
  );
  const tokenOutQ = subtract(tokenOutPoolQ, newTokenOutPoolQ);

  // We add the fee to the pool quantity, but could do something
  // different.
  return {
    tokenOutQ,
    newTokenInPoolQ: add(newTokenInPoolQ, feeTokenInQ),
    newTokenOutPoolQ,
  };
};

export { calcSwap };
