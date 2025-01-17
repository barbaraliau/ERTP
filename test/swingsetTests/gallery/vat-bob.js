// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { makeCollect } from '../../../core/contractHost';

let storedERTPAsset;
let storedPixels;

function makeBobMaker(E, log) {
  return harden({
    make(gallery) {
      const bob = harden({
        async receiveChildPayment(paymentP) {
          log('++ bob.receiveChildPayment starting');

          const { pixelIssuer: originalPixelIssuer } = await E(
            gallery,
          ).getIssuers();
          const childIssuer = E(originalPixelIssuer).getChildIssuer();
          const childPixelPurse = E(childIssuer).makeEmptyPurse();

          // putting it in a purse isn't useful but it allows us to
          // test the functionality and exclusivity

          await E(childPixelPurse).depositAll(paymentP);
          const newPayment = await E(childPixelPurse).withdrawAll();

          const useObj = await E(newPayment).getUse();

          // bob actually changes the color to light purple
          const amountP = await E(useObj).changeColorAll('#B695C0');

          storedERTPAsset = newPayment;
          storedPixels = useObj;
          return amountP;
        },
        async tryToColorPixels() {
          // bob tries to change the color to light purple
          const amountP = await E(storedPixels).changeColorAll('#B695C0');
          return amountP;
        },
        async tryToColorERTP() {
          // bob tries to change the color to light purple
          const pixels = await E(storedERTPAsset).getUse();
          const amountP = await E(pixels).changeColorAll('#B695C0');
          return amountP;
        },
        async buyFromCorkBoard(handoffSvc, dustPurseP) {
          const { pixelIssuer, dustIssuer } = await E(gallery).getIssuers();
          const collect = makeCollect(E, log);
          const boardP = E(handoffSvc).grabBoard('MeetPoint');
          const contractHostP = E(boardP).lookup('contractHost');
          const buyerInviteP = E(boardP).lookup('buyerSeat');
          const buyerSeatP = E(contractHostP).redeem(buyerInviteP);

          const pixelPurseP = E(pixelIssuer).makeEmptyPurse('purchase');
          const dustPaymentP = E(dustPurseP).withdrawAll();
          E(buyerSeatP).offer(dustPaymentP);
          const dustRefundP = E(dustIssuer).makeEmptyPurse('dust refund');
          await collect(buyerSeatP, pixelPurseP, dustRefundP, 'bob option');

          const exclusivePayment = await E(pixelPurseP).withdrawAll();

          const useObj = await E(exclusivePayment).getUse();

          // bob tries to change the color to light purple
          E(useObj)
            .changeColorAll('#B695C0')
            .then(
              amountP => {
                E(gallery)
                  .getPixelColor(amountP.quantity[0].x, amountP.quantity[0].y)
                  .then(color =>
                    log(`bob tried to color, and produced ${color}`),
                  );
              },
              rej => log('++ bob failed to color: ', rej),
            );
          return harden({
            bobRefundP: dustRefundP,
            bobPixelP: exclusivePayment,
          });
        },
        async receiveSuspiciousPayment(suspiciousPayment) {
          log('++ bob.receiveSuspiciousPayment starting');

          const { pixelIssuer: originalPixelIssuer } = await E(
            gallery,
          ).getIssuers();
          const childIssuer = E(originalPixelIssuer).getChildIssuer();
          const childPixelPurse = E(childIssuer).makeEmptyPurse();

          // There are two ways that bob can test the validity of the
          // payment.

          // 1) He can try to deposit it in a purse whose
          // issuer is a validated descendant of the originalPixelIssuer

          try {
            await E(childPixelPurse).depositAll(suspiciousPayment);
          } catch (err) {
            log('the payment could not be deposited in childPixelPurse');
          }

          // 2) He can see if the issuer of the payment is a
          //    descendant of the originalPixelIssuer

          const suspiciousIssuer = E(suspiciousPayment).getIssuer();
          const isReal = await E(originalPixelIssuer).isDescendantIssuer(
            suspiciousIssuer,
          );

          log(`is the issuer of the payment a real descendant? ${isReal}`);
        },
      });
      return bob;
    },
  });
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeBobMaker() {
        return harden(makeBobMaker(E, log));
      },
    }),
  );
}
export default harden(setup);
