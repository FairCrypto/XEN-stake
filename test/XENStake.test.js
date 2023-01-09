// SPDX-License-Identifier: MIT

const assert = require('assert');
// const { Contract } = require('ethers');
// const { Web3Provider } = require('@ethersproject/providers');
const timeMachine = require('ganache-time-traveler');
const {toBigInt} = require("../src/utils");

const XENCrypto = artifacts.require("XENCrypto");
const XENStake = artifacts.require("XENStake");

require('dotenv').config();

// const extraPrint = process.env.EXTRA_PRINT;

const ether = 10n ** 18n;

const assertAttribute = (attributes = []) => (name, value) => {
    const attr = attributes.find(a => a.trait_type === name);
    assert.ok(attr);
    if (value) {
        assert.ok(attr.value === value);
    }
}

contract("XEN Stake", async accounts => {

    let token;
    let xenStake;
    let xenCryptoAddress;
    let xenBalance;
    let genesisTs = 0;
    let tokenId;
    let currentBlock;
    // const startBlock = 0;
    const t0days = 100;
    const term = 365;
    // const term2= 100;
    const amount = 1_000n * ether;
    const expectedXENBalance = 330_000n * ether;

    before(async () => {
        try {
            token = await XENCrypto.deployed();
            xenStake = await XENStake.deployed();
            currentBlock = await web3.eth.getBlockNumber();
            xenCryptoAddress = token.address;
        } catch (e) {
            console.error(e)
        }
    })

    it("Should read XENFT symbol and name", async () => {
        assert.ok(await xenStake.name() === 'XEN Stake');
        assert.ok(await xenStake.symbol() === 'XENS');
    })

    it("Should read XEN Crypto Address params", async () => {
        assert.ok(await xenStake.xenCrypto() === xenCryptoAddress)
    })

    it("Should read XEN Crypto genesisTs", async () => {
        genesisTs = await token.genesisTs().then(_ => _.toNumber());
        assert.ok(genesisTs > 0);
    })

    it("Should verify that XEN Crypto has initial Global Rank === 1", async () => {
        const expectedInitialGlobalRank = 1;
        assert.ok(await token.globalRank().then(_ => _.toNumber()) === expectedInitialGlobalRank);
        const expectedCurrentMaxTerm = 100 * 24 * 3600;
        assert.ok(await token.getCurrentMaxTerm().then(_ => _.toNumber()) === expectedCurrentMaxTerm);
    })

    /*
    it("Should reject createStake transaction submitted before start block", async () => {
        assert.ok(currentBlock <= startBlock);
        assert.rejects(() => xenStake.bulkClaimRank(1, 1, { from: accounts[0] }), 'XENFT: Not active yet');
        const blockDelta = startBlock - currentBlock + 1;
        const blocks = Array(blockDelta).fill(null);
        for await (const _ of blocks) {
            await timeMachine.advanceBlock();
        }
        currentBlock = await web3.eth.getBlockNumber();
        assert.ok(currentBlock > startBlock);
    });
     */

    it("Should reject bulkClaimRank transaction with incorrect count OR term", async () => {
        assert.rejects(() => xenStake.createStake(0, term, { from: accounts[0] }));
        assert.rejects(() => xenStake.createStake(amount, 0, { from: accounts[0] }));
    })

    it("Should obtain initial XEN balance via regular minting", async () => {
        await assert.doesNotReject(() => token.claimRank(t0days, { from: accounts[1] }));
        await timeMachine.advanceTime(t0days * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.doesNotReject(() => token.claimMintReward({ from: accounts[1] }));
    });

    it("XEN Crypto user shall have positive XEN balance post claimMintReward", async () => {
        xenBalance = await token.balanceOf(accounts[1], { from: accounts[1] }).then(toBigInt);
        assert.ok(xenBalance === expectedXENBalance);
    });

    it("Should reject to perform createStake operation without XEN approval", async () => {
        await assert.rejects(() => xenStake.createStake(amount, term, { from: accounts[1] }));
    })

    it("Should allow to perform createStake operation with correct params and approval", async () => {
        assert.ok(xenBalance > amount)
        await assert.doesNotReject(() => token.approve(xenStake.address, amount, { from: accounts[1] }));
        const res = await xenStake.createStake(amount, term, { from: accounts[1] });
        const { tokenId: newTokenId, amount: expectedAmount, term: expectedTerm } = res.logs[1].args;
        assert.ok(newTokenId.toNumber() === 1);
        assert.ok(BigInt(expectedAmount.toString()) === amount);
        assert.ok(expectedTerm.toNumber() === term);
        tokenId = newTokenId;
    })

    it("Should reject to perform endStake operation before maturityDate", async () => {
        await assert.rejects(
            () => xenStake.endStake(tokenId, { from: accounts[1] }),
            'XENFT: Maturity not reached'
        );
    })

    it("Should allow to perform endStake operation after maturityDate", async () => {
       await timeMachine.advanceTime(term * 24 * 3600 + 24 * 3600 + 3600);
       await timeMachine.advanceBlock();
        await assert.doesNotReject(() => xenStake.endStake(tokenId, { from: accounts[1] }));
       // console.log(res);
   })

    it("Post stake, XEN Crypto user shall have XEN balance increased by APY rewards", async () => {
        const newBalance = await token.balanceOf(accounts[1], { from: accounts[1] }).then(toBigInt);
        assert.ok(newBalance === xenBalance + amount * 19n / 100n );
    });

})
