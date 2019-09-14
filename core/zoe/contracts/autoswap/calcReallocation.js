import harden from '@agoric/harden';
import { calcSwap } from './calcSwap';

// quantities is a matrix in which the first row represents the pool
// quantities and the second row is the quantity added by the player
const calcReallocation = quantities => {
  const poolQuantities = quantities[0];
  const playerQuantities = quantities[1];

  // TODO: ensure that the quantity in the 'wanted' slot is 0
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
  newPoolQuantities[2] = 0;

  const newPlayerQuantities = [];
  newPlayerQuantities[tokenInIndex] = 0;
  newPlayerQuantities[tokenOutIndex] = tokenOutQ;
  newPlayerQuantities[2] = 0;

  return harden([newPoolQuantities, newPlayerQuantities]);
};

export { calcReallocation };
