// Declare imports
import crypto from 'crypto';
import * as helpers from '../test/helpers/contract-helpers';
import { expect } from 'chai';
import { ethers, network, upgrades } from 'hardhat';
import { trackGas, GasGroup } from '../test/helpers/gas-usage';
import SSVNetworkABI from './1.1.0/SSVNetwork.json';
import SSVNetworkViewsABI from './1.1.0/SSVNetworkViews.json';

// Declare globals
let ssvNetwork: any, ssvViews: any, owners: any[], operatorIdShared: number;

const ssvNetworkAddress = '0xDD9BC35aE942eF0cFa76930954a156B3fF30a4E1';
const ssvNetworkViewsAddress = '0xafE830B6Ee262ba11cce5F32fDCd760FFE6a66e4';

describe.only('Whitelisting Tests (fork)', () => {
  before(async () => {
    owners = await ethers.getSigners();

    const ssvNetworkOwner = await impersonateAccount('0xb35096b074fdb9bBac63E3AdaE0Bbde512B2E6b6');

    const SSVNetwork = await ethers.getContractFactory('SSVNetwork', ssvNetworkOwner);
    const SSVNetworkViews = await ethers.getContractFactory('SSVNetworkViews', ssvNetworkOwner);
    const SSVOperators = await ethers.getContractFactory('SSVOperators');
    const SSVViews = await ethers.getContractFactory('SSVViews');

    const ssvNetworkMainnet = new ethers.Contract(ssvNetworkAddress, SSVNetworkABI, ssvNetworkOwner);
    const ssvViewsMainnet = new ethers.Contract(ssvNetworkViewsAddress, SSVNetworkViewsABI, ssvNetworkOwner);

    const operatorsModule = await SSVOperators.deploy();
    await operatorsModule.deployed();

    const viewsModule = await SSVViews.deploy();
    await viewsModule.deployed();

    await ssvNetworkMainnet.connect(ssvNetworkOwner).updateModule(0, operatorsModule.address);
    await ssvNetworkMainnet.connect(ssvNetworkOwner).updateModule(3, viewsModule.address);
    ssvNetwork = await upgrades.upgradeProxy(ssvNetworkMainnet.address, SSVNetwork, {
      kind: 'uups',
      unsafeAllow: ['delegatecall'],
    });
    await ssvNetwork.deployed();

    ssvViews = await upgrades.upgradeProxy(ssvViewsMainnet.address, SSVNetworkViews, {
      kind: 'uups',
      unsafeAllow: ['delegatecall'],
    });
    await ssvViews.deployed();
  });
/*
  beforeEach(async () => {
    const operator = await trackGas(ssvNetwork.connect(owners[1]).registerOperator(generateRandomHex(), 0));

    operatorIdShared = operator.eventsByName.OperatorAdded[0].args[0];
  });
*/
  // const signer = await impersonateAccount(data[0]);
  // await ssvNetwork.connect(signer).removeOperator(4);

  it('Check an EOA address is whitelisted', async () => {
    const { isWhitelisted, isWhitelistingContract } = await ssvViews.checkAddressIsWhitelisted(
      106,
      '0x6B7468504757a4918a96078F352572d172115263',
    );
    expect(isWhitelisted).to.equal(true);
    expect(isWhitelistingContract).to.equal(false);
  });

  it('Check an contract address is whitelisted', async () => {
    const { isWhitelisted, isWhitelistingContract } = await ssvViews.checkAddressIsWhitelisted(
      37,
      '0x87393BE8ac323F2E63520A6184e5A8A9CC9fC051',
    );
    expect(isWhitelisted).to.equal(true);
    expect(isWhitelistingContract).to.equal(true);
  });

  it('Check a non-whitelistd address for whitelisted operator', async () => {
    const { isWhitelisted, isWhitelistingContract } = await ssvViews.checkAddressIsWhitelisted(
      38,
      '0x24F34a87a28088cf58808D03C7f6017C6aD2150e',
    );
    expect(isWhitelisted).to.equal(false);
    expect(isWhitelistingContract).to.equal(false);
  });

  it('Check a non-whitelistd address for a non-whitelisted operator', async () => {
    const { isWhitelisted, isWhitelistingContract } = await ssvViews.checkAddressIsWhitelisted(
      200,
      '0xee2D16D8ee21072Bb3B89114b5Ddb13385D2f6d9',
    );
    expect(isWhitelisted).to.equal(false);
    expect(isWhitelistingContract).to.equal(false);
  });

  it('Add new EOA whitelisted address for a non-whitelisted operator gas limits', async () => {
    const operatorId = 150;
    const address = '0xee2D16D8ee21072Bb3B89114b5Ddb13385D2f6d9';
    const operatorData = await ssvViews.getOperatorById(operatorId);

    const signer = await impersonateAccount(operatorData[0]);

    await trackGas(ssvNetwork.connect(signer).setOperatorWhitelist(operatorId, address), [
      GasGroup.SET_OPERATOR_WHITELIST_BITMAP_NEW,
    ]);
  });

  it('Add existing EOA whitelisted address for a non-whitelisted operator gas limits', async () => {
    const address = '0xee2D16D8ee21072Bb3B89114b5Ddb13385D2f6d9';
    const operatorIdOne = generateOperator();
    const operatorIdTwo = generateOperator();

    await ssvNetwork.connect(owners[1]).setOperatorWhitelist(operatorIdOne, address);

    await trackGas(ssvNetwork.connect(owners[1]).setOperatorWhitelist(operatorIdTwo, address), [
      GasGroup.SET_OPERATOR_WHITELIST_BITMAP_EXISTING,
    ]);
  });

  it('Add new EOA whitelisted address for a non-whitelisted operator', async () => {
    const operatorId = 150;
    const address = '0xee2D16D8ee21072Bb3B89114b5Ddb13385D2f6d9';
    const operatorData = await ssvViews.getOperatorById(operatorId);

    const signer = await impersonateAccount(operatorData[0]);
    await expect(ssvNetwork.connect(signer).setOperatorWhitelist(operatorId, address))
      .to.emit(ssvNetwork, 'OperatorWhitelistUpdated')
      .withArgs(operatorId, address);

    const { isWhitelisted, isWhitelistingContract } = await ssvViews.checkAddressIsWhitelisted(operatorId, address);

    expect(isWhitelisted).to.equal(true);
    expect(isWhitelistingContract).to.equal(false);
  });

  it('Adding a whitelisting contract via setOperatorWhitelist reverts "AddressIsContract"', async () => {
    const contractAddress = '0x87393BE8ac323F2E63520A6184e5A8A9CC9fC051';
    const operatorIdOne = generateOperator();

    await expect(
      ssvNetwork.connect(owners[1]).setOperatorWhitelist(operatorIdOne, contractAddress),
    ).to.be.revertedWithCustomError(ssvNetwork, 'AddressIsContract');
  });

  it('Adding an EOA whitelisted address via setWhitelistingContract reverts "InvalidContractAddress"', async () => {
    const address = '0xee2D16D8ee21072Bb3B89114b5Ddb13385D2f6d9';
    const operatorIdOne = generateOperator();

    await expect(
      ssvNetwork.connect(owners[1]).setWhitelistingContract(operatorIdOne, address),
    ).to.be.revertedWithCustomError(ssvNetwork, 'InvalidContractAddress');
  });

  it('Add a new whitelisting contract for a non-whitelisted operator', async () => {
    const operatorId = 10;
    const contractAddress = '0x87393BE8ac323F2E63520A6184e5A8A9CC9fC051';
    const operatorData = await ssvViews.getOperatorById(operatorId);

    const signer = await impersonateAccount(operatorData[0]);

    await expect(ssvNetwork.connect(signer).setWhitelistingContract(operatorId, contractAddress))
      .to.emit(ssvNetwork, 'OperatorWhitelistUpdated')
      .withArgs(operatorId, contractAddress);

    const { isWhitelisted, isWhitelistingContract } = await ssvViews.checkAddressIsWhitelisted(
      operatorId,
      contractAddress,
    );
    expect(isWhitelisted).to.equal(true);
    expect(isWhitelistingContract).to.equal(true);
  });

  it('Add a new whitelisting contract for a non-whitelisted operator gas limit', async () => {
    const operatorId = 11;
    const contractAddress = '0x87393BE8ac323F2E63520A6184e5A8A9CC9fC051';
    const operatorData = await ssvViews.getOperatorById(operatorId);

    const signer = await impersonateAccount(operatorData[0]);

    await trackGas(ssvNetwork.connect(signer).setWhitelistingContract(operatorId, contractAddress), [
      GasGroup.SET_OPERATOR_WHITELIST_CONTRACT,
    ]);
  });

  it('Add a new whitelisting contract for a whitelisted operator', async () => {
    const operatorId = 11;
    const contractAddress = '0x9D65fF81a3c488d585bBfb0Bfe3c7707c7917f54';
    const operatorData = await ssvViews.getOperatorById(operatorId);

    const signer = await impersonateAccount(operatorData[0]);

    await expect(ssvNetwork.connect(signer).setWhitelistingContract(operatorId, contractAddress))
      .to.emit(ssvNetwork, 'OperatorWhitelistUpdated')
      .withArgs(operatorId, contractAddress);

    const { isWhitelisted, isWhitelistingContract } = await ssvViews.checkAddressIsWhitelisted(
      operatorId,
      contractAddress,
    );
    expect(isWhitelisted).to.equal(true);
    expect(isWhitelistingContract).to.equal(true);

    const { isPrivate, whitelistingContract } = await ssvViews.getOperatorById(operatorId);
    expect(whitelistingContract).to.equal(contractAddress);
    expect(isPrivate).to.equal(true);
  });
});


/**** Helper functions ****/

async function impersonateAccount(address: string) {
  await network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  return await ethers.getSigner(address);
}

async function generateRandomHex() {
  return '0x' + crypto.randomBytes(4).toString('hex');
}

async function generateOperator() {
  const operator = await trackGas(ssvNetwork.connect(owners[1]).registerOperator(generateRandomHex(), 0));
  return operator.eventsByName.OperatorAdded[0].args[0];
}
