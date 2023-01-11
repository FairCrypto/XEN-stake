const {toBigInt} = require("../src/utils");
const assert = require("assert");
const StakeInfo = artifacts.require("StakeInfo");

const extraPrint = process.env.EXTRA_PRINT;

let stakeInfo
const r = 0b1000_0000;
const l = 0b0100_0000;

// const maxUint8 = 2n ** 8n - 1n;
const maxUint16 = 2n ** 16n - 1n;
const maxUint64 = 2n ** 64n - 1n;
const maxUint128 = 2n ** 128n - 1n;
const maxUint256 = 2n ** 256n - 1n;

/*
//      term (uint16)
//      | maturityTs (uint64)
//      | amount (uint128)
//      | apy (uint16)
//      | rarityScore (uint16)
//      | rarityBits (uint16):
//          [15] tokenIdIsPrime
//          [14] tokenIdIsFib
//          [14] blockIdIsPrime
//          [13] blockIdIsFib
//          [0-13] ...
 */
contract("StakeInfo Library", async () => {

    before(async () => {
        try {
            stakeInfo = await StakeInfo.deployed();
        } catch (e) {
            console.error(e)
        }
    });

    it("Should perform RarityBits encoding/decoding", async () => {
        const testInfo = [
            { isPrime: false, isFib: false, blockIsPrime: false, blockIsFib: false },
            { isPrime: false, isFib: false, blockIsPrime: false, blockIsFib: true },
            { isPrime: false, isFib: false, blockIsPrime: true, blockIsFib: false },
            { isPrime: false, isFib: false, blockIsPrime: true, blockIsFib: true },
            { isPrime: false, isFib: true, blockIsPrime: false, blockIsFib: false },
            { isPrime: false, isFib: true, blockIsPrime: false, blockIsFib: true },
            { isPrime: false, isFib: true, blockIsPrime: true, blockIsFib: false },
            { isPrime: false, isFib: true, blockIsPrime: true, blockIsFib: true },
            { isPrime: true, isFib: false, blockIsPrime: false, blockIsFib: false },
            { isPrime: true, isFib: false, blockIsPrime: false, blockIsFib: true },
            { isPrime: true, isFib: false, blockIsPrime: true, blockIsFib: false },
            { isPrime: true, isFib: false, blockIsPrime: true, blockIsFib: true },
            { isPrime: true, isFib: true, blockIsPrime: false, blockIsFib: false },
            { isPrime: true, isFib: true, blockIsPrime: false, blockIsFib: true },
            { isPrime: true, isFib: true, blockIsPrime: true, blockIsFib: false },
            { isPrime: true, isFib: true, blockIsPrime: true, blockIsFib: true },
        ]

        for(const test of testInfo) {
            const { isPrime, isFib, blockIsPrime, blockIsFib } = test;
            const rarityBitsEncoded = await stakeInfo.encodeRarityBits(isPrime, isFib, blockIsPrime, blockIsFib);
            parseInt(extraPrint || '0') > 2 && console.log(BigInt(rarityBitsEncoded).toString(2).padStart(16, '0'))
            const rarityBitsDecoded = await stakeInfo.decodeRarityBits(rarityBitsEncoded);
            assert.ok(rarityBitsDecoded.isPrime === test.isPrime);
            assert.ok(rarityBitsDecoded.isFib === test.isFib);
            assert.ok(rarityBitsDecoded.blockIsPrime === test.blockIsPrime);
            assert.ok(rarityBitsDecoded.blockIsFib === test.blockIsFib);
        }
    });

    it("Should perform StakeInfo encoding/decoding", async () => {
        const _term = 1;
        const _maturityTs = 2;
        const _amount = 3;
        const _apy = 4;
        const _rarityScore = 5;
        const _rarityBits = 6;
        const encodedStakeInfo =
            await stakeInfo.encodeStakeInfo(_term, _maturityTs, _amount, _apy, _rarityScore, _rarityBits)
                .then(toBigInt);
        parseInt(extraPrint || '0') > 2 && console.log(BigInt(encodedStakeInfo).toString(2).padStart(256, '0'))
        const { term, maturityTs, amount, apy, rarityScore, rarityBits } =
            await stakeInfo.decodeStakeInfo(encodedStakeInfo);
        assert.ok(term.toNumber() === _term, `bad term ${term.toNumber()}`);
        assert.ok(maturityTs.toNumber() === _maturityTs, `bad maturityTs ${maturityTs.toNumber()}`);
        assert.ok(amount.toNumber() === _amount, `bad amount ${amount.toNumber()}`);
        assert.ok(apy.toNumber() === _apy, `bad apy ${apy.toNumber()}`);
        assert.ok(rarityScore.toNumber() === _rarityScore, `bad rarityScore ${rarityScore.toNumber()}`);
        assert.ok(rarityBits.toNumber() === _rarityBits, `bad rarityBits ${rarityBits.toNumber()}`);
    })

    it("Should encode correctly in overflow conditions (term)", async () => {
        const _term = maxUint256;
        const _maturityTs = 2;
        const _amount = 3;
        const _apy = 4;
        const _rarityScore = 5;
        const _rarityBits = 6;
        const encodedStakeInfo =
            await stakeInfo.encodeStakeInfo(_term, _maturityTs, _amount, _apy, _rarityScore, _rarityBits)
                .then(toBigInt);
        parseInt(extraPrint || '0') > 2 && console.log(BigInt(encodedStakeInfo).toString(2).padStart(256, '0'))
        const { term, maturityTs } = await stakeInfo.decodeStakeInfo(encodedStakeInfo);

        assert.ok(toBigInt(term) === maxUint16, `bad term ${toBigInt(term)}`);
        assert.ok(maturityTs.toNumber() === _maturityTs, `bad maturityTs ${maturityTs.toNumber()}`);
    });

    it("Should encode correctly in overflow conditions (maturityTs)", async () => {
        const _term = 1;
        const _maturityTs = maxUint256;
        const _amount = 3;
        const _apy = 4;
        const _rarityScore = 5;
        const _rarityBits = 6;
        const encodedStakeInfo =
            await stakeInfo.encodeStakeInfo(_term, _maturityTs, _amount, _apy, _rarityScore, _rarityBits)
                .then(toBigInt);
        parseInt(extraPrint || '0') > 2 && console.log(BigInt(encodedStakeInfo).toString(2).padStart(256, '0'))
        const { term, maturityTs, amount } = await stakeInfo.decodeStakeInfo(encodedStakeInfo);

        assert.ok(term.toNumber() === _term, `bad term ${term.toNumber()}`);
        assert.ok(toBigInt(maturityTs) === maxUint64, `bad maturityTs ${toBigInt(maturityTs)}`);
        assert.ok(amount.toNumber() === _amount, `bad amount ${amount.toNumber()}`);
    });

    it("Should encode correctly in overflow conditions (amount)", async () => {
        const _term = 1;
        const _maturityTs = 2;
        const _amount = maxUint256;
        const _apy = 4;
        const _rarityScore = 5;
        const _rarityBits = 6;
        const encodedStakeInfo =
            await stakeInfo.encodeStakeInfo(_term, _maturityTs, _amount, _apy, _rarityScore, _rarityBits)
                .then(toBigInt);
        parseInt(extraPrint || '0') > 2 && console.log(BigInt(encodedStakeInfo).toString(2).padStart(256, '0'))
        const { term, maturityTs, amount, apy } = await stakeInfo.decodeStakeInfo(encodedStakeInfo);

        assert.ok(term.toNumber() === _term, `bad term ${term.toNumber()}`);
        assert.ok(maturityTs.toNumber() === _maturityTs, `bad maturityTs ${maturityTs.toNumber()}`);
        assert.ok(toBigInt(amount) === maxUint128, `bad amount ${toBigInt(amount)}`);
        assert.ok(apy.toNumber() === _apy, `bad apy ${apy.toNumber()}`);
    });

    it("Should encode correctly in overflow conditions (apy)", async () => {
        const _term = 1;
        const _maturityTs = 2;
        const _amount = 3;
        const _apy = maxUint256;
        const _rarityScore = 5;
        const _rarityBits = 6;
        const encodedStakeInfo =
            await stakeInfo.encodeStakeInfo(_term, _maturityTs, _amount, _apy, _rarityScore, _rarityBits)
                .then(toBigInt);
        parseInt(extraPrint || '0') > 2 && console.log(BigInt(encodedStakeInfo).toString(2).padStart(256, '0'))
        const { term, maturityTs, amount, apy, rarityScore } = await stakeInfo.decodeStakeInfo(encodedStakeInfo);

        assert.ok(term.toNumber() === _term, `bad term ${term.toNumber()}`);
        assert.ok(maturityTs.toNumber() === _maturityTs, `bad maturityTs ${maturityTs.toNumber()}`);
        assert.ok( amount.toNumber() === _amount, `bad amount ${amount.toNumber()}`);
        assert.ok(toBigInt(apy) === maxUint16, `bad apy ${toBigInt(apy)}`);
        assert.ok(rarityScore.toNumber() === _rarityScore, `bad rarityScore ${rarityScore.toNumber()}`);
    });

    it("Should encode correctly in overflow conditions (rarityScore)", async () => {
        const _term = 1;
        const _maturityTs = 2;
        const _amount = 3;
        const _apy = 4;
        const _rarityScore = maxUint256;
        const _rarityBits = 6;
        const encodedStakeInfo =
            await stakeInfo.encodeStakeInfo(_term, _maturityTs, _amount, _apy, _rarityScore, _rarityBits)
                .then(toBigInt);
        parseInt(extraPrint || '0') > 2 && console.log(BigInt(encodedStakeInfo).toString(2).padStart(256, '0'))
        const { term, maturityTs, amount, apy, rarityScore, rarityBits } = await stakeInfo.decodeStakeInfo(encodedStakeInfo);

        assert.ok(term.toNumber() === _term, `bad term ${term.toNumber()}`);
        assert.ok(maturityTs.toNumber() === _maturityTs, `bad maturityTs ${maturityTs.toNumber()}`);
        assert.ok( amount.toNumber() === _amount, `bad amount ${amount.toNumber()}`);
        assert.ok(apy.toNumber() === _apy, `bad apy ${apy.toNumber()}`);
        assert.ok(toBigInt(rarityScore) === maxUint16, `bad rarityScore ${toBigInt(rarityScore)}`);
        assert.ok(rarityBits.toNumber() === _rarityBits, `bad rarityBits ${rarityBits.toNumber()}`);
    });

    it("Should encode correctly in overflow conditions (rarityBits)", async () => {
        const _term = 1;
        const _maturityTs = 2;
        const _amount = 3;
        const _apy = 4;
        const _rarityScore = 5;
        const _rarityBits = maxUint256;
        const encodedStakeInfo =
            await stakeInfo.encodeStakeInfo(_term, _maturityTs, _amount, _apy, _rarityScore, _rarityBits)
                .then(toBigInt);
        parseInt(extraPrint || '0') > 2 && console.log(BigInt(encodedStakeInfo).toString(2).padStart(256, '0'))
        const { term, maturityTs, amount, apy, rarityScore, rarityBits } = await stakeInfo.decodeStakeInfo(encodedStakeInfo);

        assert.ok(term.toNumber() === _term, `bad term ${term.toNumber()}`);
        assert.ok(maturityTs.toNumber() === _maturityTs, `bad maturityTs ${maturityTs.toNumber()}`);
        assert.ok( amount.toNumber() === _amount, `bad amount ${amount.toNumber()}`);
        assert.ok(apy.toNumber() === _apy, `bad apy ${apy.toNumber()}`);
        assert.ok(rarityScore.toNumber() === _rarityScore, `bad rarityScore ${rarityScore.toNumber()}`);
        assert.ok(toBigInt(rarityBits) === maxUint16, `bad rarityBits ${toBigInt(rarityBits)}`);
    });
})
