import { calcSwap } from './calcSwap';

// quantities is a matrix in which the first row represents the tokens
// put into the swap by the sole player
const reallocate = (poolQuantities, quantities) => {
  const playerQuantities = quantities[0];

  const tokenInIndex = playerQuantities[0] > 0 ? 0 : 1;
  const tokenOutIndex = 1 - tokenInIndex;

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

  return {
    poolQuantities: newPoolQuantities,
    quantities: [newPlayerQuantities],
  };
};

export { reallocate };
