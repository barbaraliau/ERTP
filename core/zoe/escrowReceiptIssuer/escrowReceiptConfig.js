import harden from '@agoric/harden';

import { noCustomization } from '../../config/noCustomization';
import { makeCoreMintKeeper } from '../../config/coreMintKeeper';
import { escrowReceiptStrategy } from './escrowReceiptStrategy';

function makeEscrowReceiptConfig() {
  return harden({
    ...noCustomization,
    makeMintKeeper: makeCoreMintKeeper,
    strategy: escrowReceiptStrategy,
  });
}

export { makeEscrowReceiptConfig };
