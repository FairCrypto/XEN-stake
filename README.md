# XEN Stake NFT // Proof-of-Stake XENFT

XEN Stake is yet another part in XEN Crypto ecosystem. It allows a user to create a special version of XEN Crypto stake, which:

- Is locked (non-redeemable) until the maturity is reached
- Is transferable* to any other user's wallet

Similarly to ordinary XEN Crypto stake, PoS XENFT could be redeemed without any penalty at any time after the maturity is reached.

NB*: there's a blackout period -7/+7 days around maturity time during which transfers are prohibited. This is a safety precaution to prevent possible price manipulation on external exchanges.

## Installation

```bash
npm install
```

## Tests

```bash
npm run test
```

## Code Style

https://docs.soliditylang.org/en/latest/style-guide.html

> Check code lint

```bash
npm run lint
```

> Fix code lint

```bash
npm run lint:fix
```

### Git Hook

This project uses [Husky](https://typicode.github.io/husky/#/) to run git hooks. The `pre-commit`
hook runs `lint-staged` to run code lint checking and code formatting before committing.

> Install Husky hooks

```shell
npm run husky:install
```

### Forwarder

Reference forwarder implementation from OpenGSN: https://github.com/opengsn/gsn/blob/master/packages/contracts/src/forwarder/Forwarder.sol
