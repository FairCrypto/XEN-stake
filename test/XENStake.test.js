// SPDX-License-Identifier: MIT

const assert = require('assert');

const timeMachine = require('ganache-time-traveler');
const {toBigInt} = require("../src/utils");
const {Contract} = require("ethers");
const {Web3Provider} = require("@ethersproject/providers");

const Numbers = artifacts.require("MagicNumbers");
const XENCrypto = artifacts.require("XENCrypto");
const XENStake = artifacts.require("XENStake");

require('dotenv').config();

const extraPrint = process.env.EXTRA_PRINT;

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
    let vsu;

    const t0days = 100;
    const term = 365;
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

    it("Should reject createStake transaction with incorrect amount OR term", async () => {
        assert.rejects(() => xenStake.createStake(0, term, { from: accounts[0] }));
        assert.rejects(() => xenStake.createStake(amount, 0, { from: accounts[0] }));
    })

    it("Should reject createStake transaction with term over 1,000 days", async () => {
        assert.rejects(() => xenStake.createStake(amount, 1_001, { from: accounts[0] }));
    })

    it("Should allow to obtain initial XEN balance via regular minting", async () => {
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
        const { gasUsed } = res.receipt;
        const { tokenId: newTokenId, amount: expectedAmount, term: expectedTerm } = res.logs[1].args;
        parseInt(extraPrint || '0') > 0 && console.log('tokenId', newTokenId.toNumber(), 'gas used', gasUsed);
        assert.ok(newTokenId.toNumber() === 1);
        assert.ok(BigInt(expectedAmount.toString()) === amount);
        assert.ok(expectedTerm.toNumber() === term);
        tokenId = newTokenId.toNumber();
    })

    it("Should be able to return tokenURI as base-64 encoded data URL", async () => {
        const encodedStr = await xenStake.tokenURI(tokenId)
        assert.ok(encodedStr.startsWith('data:application/json;base64,'));
        const base64str = encodedStr.replace('data:application/json;base64,', '');
        const decodedStr = Buffer.from(base64str, 'base64').toString('utf8');
        extraPrint === '3' && console.log(decodedStr)
        const metadata = JSON.parse(decodedStr.replace(/\n/, ''));
        assert.ok('name' in metadata);
        assert.ok('description' in metadata);
        assert.ok('image' in metadata);
        assert.ok('attributes' in metadata);
        assert.ok(Array.isArray(metadata.attributes));
        assertAttribute(metadata.attributes)('Amount', (amount / ether).toString());
        assertAttribute(metadata.attributes)('Term', term.toString());
        assertAttribute(metadata.attributes)('APY');
        assertAttribute(metadata.attributes)('Maturity DateTime');
        assertAttribute(metadata.attributes)('Maturity Year');
        assertAttribute(metadata.attributes)('Maturity Month');
        assertAttribute(metadata.attributes)('Rarity');
        assert.ok(metadata.image.startsWith('data:image/svg+xml;base64,'));
        const imageBase64 = metadata.image.replace('data:image/svg+xml;base64,', '');
        const decodedImage = Buffer.from(imageBase64, 'base64').toString();
        assert.ok(decodedImage.startsWith('<svg'));
        assert.ok(decodedImage.endsWith('</svg>'));
        extraPrint === '2' && console.log(decodedImage);
    })

    it("Should allow to perform another createStake operation with correct params and approval", async () => {
        xenBalance = await token.balanceOf(accounts[1], { from: accounts[1] }).then(toBigInt);
        assert.ok(xenBalance > amount)
        await assert.doesNotReject(() => token.approve(xenStake.address, amount, { from: accounts[1] }));
        const res = await xenStake.createStake(amount, term, { from: accounts[1] });
        const { gasUsed, rawLogs } = res.receipt;
        const { tokenId: newTokenId, amount: expectedAmount, term: expectedTerm } = res.logs[1].args;

        parseInt(extraPrint || '0') > 0 && console.log('tokenId', newTokenId.toNumber(), 'gas used', gasUsed);
        assert.ok(newTokenId.toNumber() === tokenId + 1);
        assert.ok(BigInt(expectedAmount.toString()) === amount);
        assert.ok(expectedTerm.toNumber() === term);

        vsu = rawLogs[1]?.topics[2]?.replace('000000000000000000000000', '');
        assert.ok(vsu);
    })

    it('User shall not be able to execute VSU txs directly', async () => {
        const provider = new Web3Provider(web3.currentProvider);
        const vsu0 = new Contract(vsu, xenStake.abi, provider.getSigner(1));

        assert.ok(await vsu0.xenCrypto() === xenCryptoAddress);
        assert.ok(await vsu0.name() === '');
        assert.ok(await vsu0.symbol() === '');
        assert.ok(await vsu0.owner() === accounts[0]);
        assert.ok(await vsu0.tokenIdCounter().then(_ => _.toNumber()) === 0);
        await assert.rejects(() => vsu0.callStake(1, 1, { gasLimit: 200_000 }).then(_ => _.wait()));
        await assert.rejects(() => vsu0.callWithdraw(tokenId + 1, { gasLimit: 100_000 }).then(_ => _.wait()));
        await assert.rejects(() => vsu0.powerDown().then(_ => _.wait()));
        await assert.rejects(() => vsu0.callTransfer(accounts[0], { gasLimit: 500_000 }).then(_ => _.wait()));
    });

    it("Should show correct token balance post XENFTs mints", async () => {
        const balance = await xenStake.balanceOf(accounts[1], { from: accounts[1] }).then(_ => _.toNumber());
        assert.ok(balance === 2);
    })

    it("Should show correct token IDs owned by the user", async () => {
        const ownedTokens1 = await xenStake.ownedTokens({ from: accounts[1] })
            .then(tokenIds => tokenIds.map(id => id.toNumber()));
        assert.ok(ownedTokens1.length === 2);
        assert.ok(ownedTokens1.includes(tokenId))
        assert.ok(ownedTokens1.includes(tokenId + 1))
    })

   it("Should show NO token IDs owned by the non-user", async () => {
        const ownedTokens0 = await xenStake.ownedTokens({ from: accounts[0] })
            .then(tokenIds => tokenIds.map(id => id.toNumber()));
        assert.ok(ownedTokens0.length === 0);
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
        await assert.doesNotReject(async () => {
            const res = await xenStake.endStake(tokenId, { from: accounts[1] })
            const { gasUsed } = res.receipt;
            parseInt(extraPrint || '0') > 0 && console.log('tokenId redeemed', tokenId, 'gas used', gasUsed);
        });
       // console.log(res);
   })

    it("Post stake, XEN Crypto user shall have XEN balance increased by APY rewards", async () => {
        const newBalance = await token.balanceOf(accounts[1], { from: accounts[1] }).then(toBigInt);
        assert.ok(newBalance === xenBalance + amount * 19n / 100n );
    });

    it("Post stake, stakeInfo should return zero for redeemed token Id, and non-zero for active one", async () => {
        const stakeInfo1 = await xenStake.stakeInfo(tokenId, { from: accounts[1] }).then(toBigInt);
        assert.ok(stakeInfo1 === 0n);
        const stakeInfo2 = await xenStake.stakeInfo(tokenId + 1, { from: accounts[1] }).then(toBigInt);
        assert.ok(stakeInfo2 > 0n);
    });

    it("Should reject XENFT transfer by a non-owner and no approval", async () => {
        await assert.rejects(
            () => xenStake.transferFrom(accounts[2], accounts[3], tokenId + 1),
            'ERC721: transfer from incorrect owner'
        );
    })

    it("Should not allow to transfer XEN Stake XENFT with incorrect or redeemed tokenId", async () => {
        await assert.rejects(
            () => xenStake.transferFrom(accounts[1], accounts[2], tokenId, { from: accounts[1] }),
            'ERC721: invalid token ID'
        );
    });

    it("Should not allow to transfer XEN Stake tokenId in the blackout period", async () => {
        await assert.rejects(
            () => xenStake.transferFrom(accounts[1], accounts[2], tokenId + 1, { from: accounts[1] }),
            'XENFT: transfer prohibited in blackout period'
        );
    });

    it("Should allow to transfer XEN Stake tokenId after the blackout period", async () => {
        await timeMachine.advanceTime(7 * 24 * 3600 + 24 * 3600 + 3600);
        await timeMachine.advanceBlock();
        await assert.doesNotReject(
            () => xenStake.transferFrom(accounts[1], accounts[2], tokenId + 1, { from: accounts[1] }),
        );
    })

    it("Should access deployed MagicNumbers library", async () => {
        assert.ok(Numbers.deployed());
    });

})
