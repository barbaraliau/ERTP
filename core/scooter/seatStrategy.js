import harden from '@agoric/harden';

// quantity = [{
//   src: 'swap',
//   id: 1,
//   offerToBeMade: [rule1, rule2],
// }]

// quantity = [{
//   src: 'swap',
//   id: 1,
//   offersMade: [rule1, rule2],
// }]

function insistSeatList(seatList, canvasSize) {
  insist(passStyleOf(pixelList) === 'copyArray')`pixelList must be an array`;
  for (let i = 0; i < pixelList.length; i += 1) {
    insistPixel(pixelList[i], canvasSize);
  }
}

const seatStrategy = harden({
  insistKind: pixelList => {
    insistPixelList(pixelList, canvasSize);
    return harden(pixelList);
  },
  empty: _ => harden([]),
  isEmpty: list => list.length === 0,
  includes: (whole, part) => includesPixelList(whole, part),
  equals: (left, right) =>
    pixelStrategy.includes(left, right) &&
    pixelStrategy.includes(right, left),
  with: (left, right) => harden(withPixelList(left, right)),
  without: (whole, part) => harden(withoutPixelList(whole, part)),
});


harden(seatStrategy);

export { seatStrategy };
