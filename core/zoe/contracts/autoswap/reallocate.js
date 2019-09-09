import { calcSwap } from './calcSwap';

// quantities is a matrix in which the first row represents the
// quantities of the pool, and the second row represents the tokens
// put into the swap by the sole player
const reallocate = quantities => {
  const poolQuantities = quantities[0];
  const playerQuantities = quantities[1];

  const tokenInIndex = playerQuantities[0] > 0 ? 0 : 1;
  const tokenOutIndex = tokenInIndex === 0 ? 1 : 0;

  const { tokenOutQ, newTokenInPoolQ, newTokenOutPoolQ } = calcSwap(
    poolQuantities[tokenInIndex],
    poolQuantities[tokenOutIndex],
    playerQuantities[tokenInIndex],
  );

  const newPoolQuantities = [];
  newPoolQuantities[tokenInIndex] = newTokenInPoolQ;
  newPoolQuantities[tokenOutIndex] = newTokenOutPoolQ;

  const newPlayerQuantities = [];
  newPlayerQuantities[tokenInIndex] = 0;
  newPlayerQuantities[tokenOutIndex] = tokenOutQ;

  return [newPoolQuantities, newPlayerQuantities];
};

export { reallocate };
