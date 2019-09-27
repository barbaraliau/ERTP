// Copyright (C) 2019 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { makeCollect } from '../../../core/contractHost';
import { insist } from '../../../util/insist';
import { allComparable } from '../../../util/sameStructure';

function makeBidderMaker(E, host, log) {
  const collect = makeCollect(E, log);

  return harden({
    makeBidder(
      agencyEscrowInstallationP,
      auctionInstallationP,
      timerP,
      myMoneyPurseP,
      myArtPurseP,
      bidSeat,
    ) {
      const bidder = harden({
        offerSeat(bidderSeatInviteP, termsP) {
          log('++ bidder.offerSeat starting');
          E(timerP).tick(`BIDDER: starting offerSeat()`);
          const inviteIssuerP = E(host).getInviteIssuer();
          const bidderSeatPaymentP = E(inviteIssuerP).claimAll(
            bidderSeatInviteP,
            'offer',
          );
          const bidPaymentP = E(myMoneyPurseP).withdrawAll('a bid payment');

          const allegedInviteBalanceP = E(bidderSeatPaymentP).getBalance();
          E.resolve(
            allComparable(harden([termsP, allegedInviteBalanceP])),
          ).then(p => {
            const [terms, allegedInviteBalance] = p;
            E(auctionInstallationP)
              .checkAmount(allegedInviteBalance, terms, bidSeat)
              .then(v => insist(v)` installation must verify.`);
            const { deadline } = terms;
            insist(deadline > 5 && deadline < 40)`unreasonable deadline`;
            E(timerP)
              .ticks()
              .then(ticks => insist(ticks < deadline)`Deadline already passed`);
            E(timerP).tick(`BIDDER: verification.`);
          });

          const bidderSeatP = E(host).redeem(bidderSeatPaymentP);
          E(bidderSeatP)
            .offer(bidPaymentP)
            .then(bid => E(timerP).tick(`BIDDER: bid ${bid}`));

          E(timerP).tick(`BIDDER: queuing collection`);
          return collect(
            bidderSeatP,
            myArtPurseP,
            myMoneyPurseP,
            'bidder earnings',
          );
        },
      });
      return bidder;
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
      makeBidderMaker(host) {
        return harden(makeBidderMaker(E, host, log));
      },
    }),
  );
}

export default harden(setup);