// SPDX-License-Identifier: MIT

const assert = require('assert');
const timeMachine = require('ganache-time-traveler');
const truffleAssert = require('truffle-assertions');

const XENCrypto = artifacts.require("XENCrypto");
const XENStake = artifacts.require("XENStake");
const Burner = artifacts.require("Burner");
const BadBurner = artifacts.require("BadBurner");
const RevertingBurner = artifacts.require("RevertingBurner");

require('dotenv').config();

// const extraPrint = process.env.EXTRA_PRINT;

contract("XEN Stake --- Burn interface", async accounts => {

    const t0days = 100;
    const term = 10;
    let token;
    let xenStake;
    let burner;
    let badBurner;
    let revertingBurner;
    let ownedTokens;
    let xenBalance;

    before(async () => {
        try {
            token = await XENCrypto.deployed();
            xenStake = await XENStake.deployed();

            burner = await Burner.new(xenStake.address);
            badBurner = await BadBurner.new(xenStake.address);
            revertingBurner = await RevertingBurner.new(xenStake.address);

        } catch (e) {
            console.error(e)
        }
    });

    it("Should obtain some XEN via regular minting", async () => {
        await assert.doesNotReject(() => token.claimRank(t0days, { from: accounts[1] }));
        await timeMachine.advanceTime(t0days * 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.doesNotReject(() => token.claimMintReward({ from: accounts[1] }));
        // console.log(await token.balanceOf(accounts[1]).then(toBigInt));
    });

    it("Should obtain some XENFTs via staking", async () => {
        await assert.doesNotReject(() => token.approve(xenStake.address, 1 + 10 + 100 + 1000, { from: accounts[1] }));
        await assert.doesNotReject(() => xenStake.createStake(1, term, { from: accounts[1] }));
        await assert.doesNotReject(() => xenStake.createStake(10, term, { from: accounts[1] }));
        await assert.doesNotReject(() => xenStake.createStake(100, term, { from: accounts[1] }));
        await assert.doesNotReject(() => xenStake.createStake(1000, term, { from: accounts[1] }));

        xenBalance = await xenStake.balanceOf(accounts[1], {from: accounts[1]}).then(_ => _.toNumber());
        assert.ok(xenBalance === 4);
        ownedTokens = await xenStake.ownedTokens({from: accounts[1]}).then(tokenIds => tokenIds.map(_ => _.toNumber()));
        assert.ok(ownedTokens.length === 4);
    });

    it('Should not allow calling Burn function directly from EOA', async () => {
        await truffleAssert.fails(xenStake.burn(accounts[1], 1, {from: accounts[1]}));
    })

    it('Should not allow calling Burn function for tokenId which is not owned', async () => {
        await truffleAssert.fails(
            burner.exchangeTokens(0, {from: accounts[1]}),
            'XENFT burn: illegal tokenId'
        )
    })

    it('Should not allow calling Burn function for tokenId which is owned but not approved', async () => {
        await truffleAssert.fails(
            burner.exchangeTokens(ownedTokens[0], {from: accounts[1]}),
            'XENFT burn: not an approved operator'
        )
    })

    it('Should not allow calling Burn function for tokenId which is approved but not owned', async () => {
       await truffleAssert.fails(
           xenStake.approve(burner.address, 1111, {from: accounts[1]}),
           'ERC721: invalid token ID'
        )
    })

    it('Should allow calling Burn function from supported contract after prior approval', async () => {
        await assert.doesNotReject(() => xenStake.approve(burner.address, ownedTokens[0], {from: accounts[1]}));
        await assert.doesNotReject(burner.exchangeTokens(ownedTokens[0], {from: accounts[1]}));
    })

    it('Post burn, balances for XEN and other contract should show correct numbers', async () => {
        const _xenBalance = await xenStake.balanceOf(accounts[1], {from: accounts[1]}).then(_ => _.toNumber())
        const otherBalance = await burner.balanceOf(accounts[1], {from: accounts[1]}).then(_ => _.toNumber())
        assert.ok(_xenBalance === xenBalance - 1);
        assert.ok(otherBalance === ownedTokens[0]);
    })

    it('Should NOT allow calling Burn function from reentrancy-exploiting contract', async () => {
        await assert.doesNotReject(() => xenStake.approve(badBurner.address, ownedTokens[1], {from: accounts[1]}));
        await truffleAssert.fails(
            badBurner.exchangeTokens(ownedTokens[1], {from: accounts[1]}),
            'ERC721: invalid token ID'
            //'XENFT: Reentrancy detected'
        );
        const _xenBalance = await xenStake.balanceOf(accounts[1], {from: accounts[1]}).then(_ => _.toNumber())
        assert.ok(_xenBalance === xenBalance - 1);
    })

    it('Should fail transaction and revert state if an error happened in a Burner contract', async () => {
        await assert.doesNotReject(() => xenStake.approve(revertingBurner.address, ownedTokens[1], {from: accounts[1]}));
        await truffleAssert.fails(revertingBurner.exchangeTokens(ownedTokens[1], {from: accounts[1]}));
        const _xenBalance = await xenStake.balanceOf(accounts[1], {from: accounts[1]}).then(_ => _.toNumber())
        assert.ok(_xenBalance === xenBalance - 1);
    })

})
