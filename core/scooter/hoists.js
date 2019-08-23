import { mapMatrix } from './utils';

function toAmountMatrix(assays, quantitiesMatrix) {
  const assayMakes = assays.map(assay => assay.make);
  return mapMatrix(quantitiesMatrix, assayMakes);
}

export { toAmountMatrix };
