import { mapArrayOnMatrix } from './utils';

function toAmountMatrix(assays, quantitiesMatrix) {
  const assayMakes = assays.map(assay => assay.make);
  return mapArrayOnMatrix(quantitiesMatrix, assayMakes);
}

export { toAmountMatrix };
