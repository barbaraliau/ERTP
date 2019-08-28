import harden from '@agoric/harden';
import { performance } from 'perf_hooks';

import { makeWholePixelList } from '../../../../more/pixels/types/pixelList';
import { compare, isEqual } from '../../../../more/pixels/types/pixel';

// Test the performance of different set operations for pixelLists.
// Doesn't check accuracy

function includesElement(list, element) {
  for (const e of list) {
    if (isEqual(element, e)) {
      return true;
    }
  }
  return false;
}

const withNoDup = (left, right) => {
  const combinedList = Array.from(left);
  for (const rightElement of right) {
    if (!includesElement(left, rightElement)) {
      combinedList.push(rightElement);
    }
  }
  return harden(combinedList);
};

const withHalfDup = (left, right) => {
  const combinedList = Array.from(left);
  for (const rightElement of right) {
    if (
      !includesElement(left, rightElement) &&
      !includesElement(combinedList, rightElement)
    ) {
      combinedList.push(rightElement);
    }
  }
  return harden(combinedList);
};

const withFullDup = (left, right) => {
  const combinedList = left.concat(right);
  const dedupedList = [];
  for (const element of combinedList) {
    if (!includesElement(dedupedList, element)) {
      dedupedList.push(element);
    }
  }
  return harden(dedupedList);
};

const withFullDupSorted = (left, right) => {
  const combinedList = left.concat(right);
  combinedList.sort(compare);
  const dedupedList = [];
  let prev;
  for (const element of combinedList) {
    if (prev === undefined || !isEqual(element, prev)) {
      dedupedList.push(element);
    }
    prev = element;
  }
  return harden(dedupedList);
};

// only works with native identity, e.g. for number ids, not objects
const withSets = (left, right) => {
  const combinedList = left.concat(right);
  const set = new Set(combinedList);
  return harden(Array.from(set));
};

const array100 = makeWholePixelList(100);
const array200 = makeWholePixelList(200);

const left = array100.concat(array100); // duplicate every array1 element
const right = array100.concat(array200); // duplicate the first half of array2 elements

// The deduplicated result should be array200, with length 200.

// https://stackoverflow.com/questions/313893/how-to-measure-time-taken-by-a-function-to-execute
// const t0 = performance.now();

// const withNoDupResult = withNoDup(left, right);

// const t1 = performance.now();
// console.log(`Call to withNoDup took ${t1 - t0} milliseconds.`);
// console.log(`withNoDupResult has length: ${withNoDupResult.length}`);

// const withHalfDupResult = withHalfDup(left, right);

// const t2 = performance.now();
// console.log(`Call to withHalfDup took ${t2 - t1} milliseconds.`);
// console.log(`withHalfDupResult has length: ${withHalfDupResult.length}`);

// const withFullDupResult = withFullDup(left, right);

// const t3 = performance.now();
// console.log(`Call to withFullDup took ${t3 - t2} milliseconds.`);
// console.log(`withFullDupResult has length: ${withFullDupResult.length}`);

// const withFullDupSortedResult = withFullDupSorted(left, right);

// const t4 = performance.now();
// console.log(`Call to withFullDupSorted took ${t4 - t3} milliseconds.`);
// console.log(
//   `withFullDupSortedResult has length: ${withFullDupSortedResult.length}`,
// );

const array2 = makeWholePixelList(2);
const array10 = makeWholePixelList(10);

const withFullDupSortedResult = withFullDupSorted(array2, array10);
console.log(withFullDupSortedResult.length, 100);
