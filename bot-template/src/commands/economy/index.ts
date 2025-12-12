/**
 * Economy Commands Index
 * Exports all economy commands
 */

import * as balance from './balance';
import * as daily from './daily';
import * as work from './work';
import * as crime from './crime';
import * as rob from './rob';
import * as pay from './pay';
import * as deposit from './deposit';
import * as withdraw from './withdraw';
import * as leaderboard from './leaderboard';
import * as shop from './shop';
import * as buy from './buy';
import * as inventory from './inventory';
import * as gamble from './gamble';
import * as giveMoney from './give-money';

export const economyCommands = {
  balance,
  daily,
  work,
  crime,
  rob,
  pay,
  deposit,
  withdraw,
  leaderboard,
  shop,
  buy,
  inventory,
  gamble,
  giveMoney,
};

// Export command data for registration
export const economyCommandData = [
  balance.data,
  daily.data,
  work.data,
  crime.data,
  rob.data,
  pay.data,
  deposit.data,
  withdraw.data,
  leaderboard.data,
  shop.data,
  buy.data,
  inventory.data,
  gamble.data,
  giveMoney.data,
];
