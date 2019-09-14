import { operations } from './operations';

const { mult, divide } = operations;

const calcLiquidityQOut = (currentSupply, tokenAPoolQ, tokenAQIn) =>
  currentSupply > 0
    ? divide(mult(tokenAQIn, currentSupply), tokenAPoolQ)
    : tokenAQIn;

export { calcLiquidityQOut };
