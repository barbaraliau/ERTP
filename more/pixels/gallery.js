import Nat from '@agoric/nat';
import harden from '@agoric/harden';

import { makeCollect } from '../../core/contractHost';
import { insist } from '../../util/insist';
import { makePixelConfigMaker } from './pixelConfig';
import { makeMint } from '../../core/issuers';
import { makeWholePixelList } from './types/pixelList';
import {
  makeInsistPixel,
  isEqual as isEqualPixel,
  getDistance,
  getDistanceFromCenter,
} from './types/pixel';

import { makeLruQueue } from './lruQueue';
import { getRandomColor } from './randomColor';

import { escrowExchangeSrcs } from '../../core/escrow';

function mockStateChangeHandler(_newState) {
  // does nothing
}

export function makeGallery(
  E,
  log,
  contractHost,
  stateChangeHandler = mockStateChangeHandler,
  canvasSize = 10,
) {
  function makeRandomData() {
    const pixels = [];
    for (let x = 0; x < canvasSize; x += 1) {
      const pixelRow = [];
      for (let y = 0; y < canvasSize; y += 1) {
        pixelRow.push(getRandomColor(x / canvasSize, y));
      }
      pixels.push(pixelRow);
    }
    return pixels;
  }
  const state = makeRandomData();

  // provide state for the canvas html page
  function getState() {
    return JSON.stringify(state);
  }

  // create all pixels (list of raw objs)
  const allPixels = makeWholePixelList(canvasSize);

  // create LRU for "seemingly unpredictable" output from faucet
  const { lruQueue, lruQueueBuilder, lruQueueAdmin } = makeLruQueue(
    isEqualPixel,
  );

  function insistNonEmptyAmount(issuer, amount) {
    insist(!issuer.getAssay().isEmpty(amount))`\
      no use rights present in amount ${amount}`;
  }

  function insistAssetHasAmount(issuer, asset, amount) {
    insist(issuer.getAssay().includes(asset.getBalance(), amount))`\
      ERTP asset ${asset} does not include amount ${amount}`;
  }

  function getPixelList(issuer, amount) {
    return issuer.getAssay().quantity(amount);
  }

  const collect = makeCollect(E, log);

  function insistColor(allegedColor) {
    // TODO: write rules
    insist(true)`color ${allegedColor} must be a valid color`;
  }

  function setPixelListState(pixelList, newColor) {
    for (let i = 0; i < pixelList.length; i += 1) {
      const pixel = pixelList[i];
      state[pixel.x][pixel.y] = newColor;
      // eslint-disable-next-line no-use-before-define
      lruQueue.requeue(pixel);
    }

    // for now we pass the whole state, but only once per call
    stateChangeHandler(getState());
  }

  // anyone can getPixelColor, no restrictions, no tokens
  function getPixelColor(x, y) {
    const rawPixel = harden({ x: Nat(x), y: Nat(y) });
    return state[rawPixel.x][rawPixel.y];
  }

  // makeUseObj is part of the configuration passed into makeMint and
  // is used to create the "use object" that is associated with an
  // underlying asset (purse or payment). In this case, the use object
  // has the methods for changing the color of pixels

  function makeUseObj(issuer, asset) {
    const useObj = harden({
      // change the color of the pixels in the amount after checking
      // that the asset has the authority to do so.
      changeColor(amount, newColor) {
        // TODO: allow empty amounts to be used without throwing
        // an error, but because there is no authority, nothing happens.
        insistNonEmptyAmount(issuer, amount);
        insistAssetHasAmount(issuer, asset, amount);
        insistColor(newColor);
        const pixelList = getPixelList(issuer, amount);
        setPixelListState(pixelList, newColor);
        return amount;
      },
      // Call changeColor, just with the entire balance of the
      // underlying asset.
      changeColorAll(newColor) {
        return useObj.changeColor(asset.getBalance(), newColor);
      },
      // A helper function for getting a literal list of pixels from
      // the asset. For example, [ { x:0, y:0 } ]
      getRawPixels() {
        const assay = issuer.getAssay();
        const pixelList = assay.quantity(asset.getBalance());
        return pixelList;
      },
      // returns an array where each item is a pixel in this asset amount
      // as well as its color
      getColors() {
        const pixelList = useObj.getRawPixels();
        const colors = [];
        for (const pixel of pixelList) {
          const colorPerPixel = harden({
            x: pixel.x,
            y: pixel.y,
            color: getPixelColor(pixel.x, pixel.y),
          });
          colors.push(colorPerPixel);
        }
        return colors;
      },
    });
    return useObj;
  }

  const makePixelConfig = makePixelConfigMaker(makeUseObj);

  const galleryPixelMint = makeMint('pixels', makePixelConfig);
  const galleryPixelIssuer = galleryPixelMint.getIssuer();
  const galleryPixelAssay = galleryPixelIssuer.getAssay();

  // For lack of a better word, the issuer below the gallery issuer is
  // the "consumer issuer" - this is the issuer of the pixel payments
  // that consumers get from calling `tapFaucet`

  const consumerPixelIssuer = galleryPixelIssuer.getChildIssuer();
  const consumerPixelAssay = consumerPixelIssuer.getAssay();

  // Dust is the currency that the Gallery accepts for pixels
  const dustMint = makeMint('dust');
  const dustIssuer = dustMint.getIssuer();
  const dustAssay = dustIssuer.getAssay();

  const pixelToPayment = new Map();

  function getPixelStr(pixel) {
    return `x:${pixel.x},y:${pixel.y}`;
  }

  // TODO: build lruQueue from an array, without iterating here
  for (const pixel of allPixels) {
    lruQueueBuilder.push(pixel);
    const amount = galleryPixelAssay.make(harden([pixel]));
    const purse = galleryPixelMint.mint(amount);
    const payment = purse.withdrawAll();
    pixelToPayment.set(getPixelStr(pixel), payment);
  }
  lruQueueBuilder.resortArbitrarily(allPixels.length, 7);

  // read-only access for the admin interface.
  function reportPosition(rawPixel) {
    return lruQueueAdmin.reportPosition(rawPixel);
  }

  function tapFaucet() {
    const pixel = lruQueue.popToTail();
    const payment = pixelToPayment.get(getPixelStr(pixel));
    return payment.claimChild();
  }

  function pricePixelInternal(rawPixel) {
    makeInsistPixel(canvasSize)(rawPixel);
    const distance = getDistanceFromCenter(rawPixel, canvasSize);
    // prices are simplistic for now
    // they range from canvasSize / 2 to canvasSize
    const rawPrice = canvasSize - distance;
    return rawPrice;
  }

  function pricePixelAmount(pixelAmount) {
    pixelAmount = consumerPixelAssay.coerce(pixelAmount);
    const rawPixelList = consumerPixelAssay.quantity(pixelAmount);
    let totalPriceInDust = 0;
    for (const rawPixel of rawPixelList) {
      totalPriceInDust += pricePixelInternal(rawPixel);
    }
    return dustAssay.make(totalPriceInDust);
  }

  const sellBuyPixelPurseP = consumerPixelIssuer.makeEmptyPurse();
  const sellBuyDustPurseP = dustIssuer.makeEmptyPurse();

  // only direct child pixels of the galleryPixels can be sold to the gallery
  function sellToGallery(pixelAmountP) {
    return Promise.resolve(pixelAmountP).then(async pixelAmount => {
      pixelAmount = consumerPixelAssay.coerce(pixelAmount);
      const dustAmount = pricePixelAmount(pixelAmount);
      // just mint the dust that we need
      const tempDustPurseP = dustMint.mint(dustAmount);
      const dustPaymentP = tempDustPurseP.withdraw(
        dustAmount,
        'dust for pixel',
      );
      // dustPurse is dropped
      const terms = harden({ left: dustAmount, right: pixelAmount });
      const escrowExchangeInstallationP = await E(contractHost).install(
        escrowExchangeSrcs,
      );
      const { left: galleryInviteP, right: userInviteP } = await E(
        escrowExchangeInstallationP,
      ).spawn(terms);
      const seatP = E(contractHost).redeem(galleryInviteP);
      E(seatP).offer(dustPaymentP);
      collect(seatP, sellBuyPixelPurseP, sellBuyDustPurseP, 'gallery escrow');
      return harden({
        inviteP: userInviteP,
        host: contractHost,
      });
    });
  }

  // only direct children of the gallery pixels can be bought from gallery
  function buyFromGallery(pixelAmountP) {
    return Promise.resolve(pixelAmountP).then(async pixelAmount => {
      pixelAmount = consumerPixelAssay.coerce(pixelAmount);

      // if the gallery purse contains this pixelAmount, we will
      // create a invite to trade, otherwise we return a message
      const pixelPurseAmount = sellBuyPixelPurseP.getBalance();
      if (!consumerPixelAssay.includes(pixelPurseAmount, pixelAmount)) {
        return harden({
          inviteP: undefined,
          host: undefined,
          message: 'gallery did not have the pixels required',
        });
      }
      const pixelPaymentP = await E(sellBuyPixelPurseP).withdraw(pixelAmount);
      const dustAmount = pricePixelAmount(pixelAmount);

      // same order as in sellToGallery
      // the left will have to provide dust, right will have to
      // provide pixels. Left is the user, right is the gallery
      const terms = harden({ left: dustAmount, right: pixelAmount });
      const escrowExchangeInstallationP = E(contractHost).install(
        escrowExchangeSrcs,
      );
      // order switch compared to as in sellToGallery
      const { left: userInviteP, right: galleryInviteP } = await E(
        escrowExchangeInstallationP,
      ).spawn(terms);
      const seatP = E(contractHost).redeem(galleryInviteP);
      E(seatP).offer(pixelPaymentP);
      // user is buying from gallery, giving dust
      // gallery is selling, getting dust and giving pixels
      // win purse for gallery is a dust purse, refund is
      collect(seatP, sellBuyDustPurseP, sellBuyPixelPurseP, 'gallery escrow');
      return harden({
        inviteP: userInviteP,
        host: contractHost,
        dustNeeded: dustAmount,
      });
    });
  }

  function collectFromGallery(seatP, purseLeftP, purseRightP, name) {
    return collect(seatP, purseLeftP, purseRightP, name);
  }

  function getIssuers() {
    return harden({
      pixelIssuer: consumerPixelIssuer,
      dustIssuer,
    });
  }

  function getPayment(pixel) {
    return pixelToPayment.get(getPixelStr(pixel));
  }

  const userFacet = harden({
    getPixelColor,
    tapFaucet,
    getIssuers,
    getCanvasSize() {
      return canvasSize;
    },
    pricePixelAmount, // transparent pricing for now
    sellToGallery,
    buyFromGallery,
    collectFromGallery,
  });

  const adminFacet = harden({
    getDistance,
    getDistanceFromCenter,
    reportPosition,
    pricePixelAmount,
    dustMint,
    getPayment,
  });

  const readFacet = harden({
    getState,
    getPixelColor,
  });

  const gallery = harden({
    userFacet,
    adminFacet,
    readFacet,
  });

  return gallery;
}
