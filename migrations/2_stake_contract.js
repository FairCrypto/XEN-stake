const XENStake = artifacts.require("XENStake");
const XENCrypto = artifacts.require("XENCrypto");
const MagicNumbers = artifacts.require("MagicNumbers");

const DateTime = artifacts.require("DateTime");
// const StringData = artifacts.require("StringData");
const StakeInfo = artifacts.require("StakeInfo");
const StakeMetadata = artifacts.require("StakeMetadata");

require("dotenv").config();

module.exports = async function (deployer, network) {

    const xenContractAddress = process.env[`${network.toUpperCase()}_CONTRACT_ADDRESS`];

    await deployer.deploy(DateTime);
    await deployer.link(DateTime, StakeMetadata);

    //await deployer.deploy(StringData);
    //await deployer.link(StringData, Metadata);

    await deployer.deploy(StakeInfo);
    await deployer.link(StakeInfo, StakeMetadata);
    await deployer.link(StakeInfo, XENStake);

    await deployer.deploy(StakeMetadata);
    await deployer.link(StakeMetadata, XENStake);

    await deployer.deploy(MagicNumbers);
    await deployer.link(MagicNumbers, XENStake);

    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
    const startBlock = process.env[`${network.toUpperCase()}_START_BLOCK`] || 0;
    const forwarder = process.env[`${network.toUpperCase()}_FORWARDER`] || ZERO_ADDRESS;
    const royaltyReceiver = process.env[`${network.toUpperCase()}_ROYALTY_RECEIVER`] || ZERO_ADDRESS;

    console.log('    start block:', startBlock);
    console.log('    forwarder:', forwarder);
    console.log('    royalty receiver:', royaltyReceiver);

    if (xenContractAddress) {
        await deployer.deploy(
            XENStake,
            xenContractAddress,
            startBlock,
            forwarder,
            royaltyReceiver
        );
    } else {
        const xenContract = await XENCrypto.deployed();
        // console.log(network, xenContract?.address)
        await deployer.deploy(
            XENStake,
            xenContract.address,
            startBlock,
            forwarder,
            royaltyReceiver
        );
    }
    if (network === 'test') {
        // const xenftAddress = XENStake.address;
        // const xenCryptoAddress = XENCrypto.address;
        // console.log(xenftAddress);
        // await deployer.deploy(TestBulkMinter, xenCryptoAddress, xenftAddress);
    }
};
