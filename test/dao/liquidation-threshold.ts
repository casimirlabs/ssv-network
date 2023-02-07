// Declare imports
import * as helpers from '../helpers/contract-helpers';
import { progressTime } from '../helpers/utils';
import { expect } from 'chai';
import { time } from "@nomicfoundation/hardhat-network-helpers";

// Declare globals
let ssvNetworkContract: any, networkFee: any;

describe('Liquidation Threshold Tests', () => {
  beforeEach(async () => {
    // Initialize contract
    ssvNetworkContract = (await helpers.initializeContract()).contract;

    // Define minumum allowed network fee to pass shrinkable validation
    networkFee = helpers.CONFIG.minimalOperatorFee / 10;
  });

  it('Change liquidation threshold period emits "LiquidationThresholdPeriodUpdated"', async () => {
    const timestamp = await time.latest() + 1;
    const releaseDate = timestamp + (86400 * 2);
    const selector = ssvNetworkContract.interface.getSighash("updateLiquidationThresholdPeriod(uint64)");

    await expect(ssvNetworkContract.updateLiquidationThresholdPeriod(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10)).to.emit(ssvNetworkContract, 'FunctionLocked').withArgs(selector, releaseDate, helpers.DB.owners[0].address);
    await progressTime(172800); // 2 days
    await expect(ssvNetworkContract.updateLiquidationThresholdPeriod(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10)).to.emit(ssvNetworkContract, 'LiquidationThresholdPeriodUpdated').withArgs(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10);
  });

  it('Change liquidation threshold period before 2 days period reverts "FunctionIsLocked"', async () => {
    const timestamp = await time.latest() + 1;
    const releaseDate = timestamp + (86400 * 2);
    const selector = ssvNetworkContract.interface.getSighash("updateLiquidationThresholdPeriod(uint64)");

    await expect(ssvNetworkContract.updateLiquidationThresholdPeriod(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10)).to.emit(ssvNetworkContract, 'FunctionLocked').withArgs(selector, releaseDate, helpers.DB.owners[0].address);
    await progressTime(86400); // 1 day
    await expect(ssvNetworkContract.updateLiquidationThresholdPeriod(helpers.CONFIG.minimalBlocksBeforeLiquidation + 10)).to.be.revertedWithCustomError(ssvNetworkContract, 'FunctionIsLocked');
  });

  it('Get liquidation threshold period', async () => {
    expect(await ssvNetworkContract.getLiquidationThresholdPeriod()).to.equal(helpers.CONFIG.minimalBlocksBeforeLiquidation);
  });

  it('Change liquidation threshold period reverts "NewBlockPeriodIsBelowMinimum"', async () => {
    await expect(ssvNetworkContract.updateLiquidationThresholdPeriod(helpers.CONFIG.minimalBlocksBeforeLiquidation - 10)).to.be.revertedWithCustomError(ssvNetworkContract,'NewBlockPeriodIsBelowMinimum');
  });

  it('Change liquidation threshold period reverts "caller is not the owner"', async () => {
    await expect(ssvNetworkContract.connect(helpers.DB.owners[3]).updateLiquidationThresholdPeriod(helpers.CONFIG.minimalBlocksBeforeLiquidation)).to.be.revertedWith('Ownable: caller is not the owner');
  });
});