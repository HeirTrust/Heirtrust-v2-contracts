# Heirtrust Contracts Core V2


[![Twitter](https://img.shields.io/twitter/follow/heirtrust?style=social)](https://twitter.com/heirtrust)

HeirTrust is a decentralized Dead Man's Switch built for EVM and Arweave.

## Overview

This repository contains the smart contracts (and corresponding deployment scripts) that power the HeirTrust system. 

## Local Development Guide
### Clone the repository and install the dependencies

```bash
git clone git@github.com:heirtrust/heirtrust-v2-contracts.git
cd heirtrust-v2-contracts
nvm use
npm install

# run tests to ensure that things are in working order
npm run test 

# deploy contracts to local hardhat network
npm run start # or npx hardhat node
```

### Configure the environment

```bash
cp .env.example .env
```

- Populate `GOERLI_PROVIDER` with a valid provider url. Infura offers free tier endpoints.

### Launch the console

- Launch the console on a specific network with

```bash
npx hardhat console --network localhost
# or for goerli
npx hardhat console --network goerli
```

- Load the smart contracts into the console’s HRE by calling `loadContracts()`
  - the function will retrieve the diamond address from ./deployments/<current network>/Diamond.json
  - you may optionally pass in a diamond address
- Connect a funded signer so that contract calls are made with an account that can pay gas and HRT fees
  - on the `localhost` network you don’t need to do anything because the default signer is already funded with ether and HRT
  - on `goerli` you’ll need to connect a signer by supplying the private key for an account that owns goerli ether and goerli HRT
  - call `connectSigner('<funded private key>')`

```javascript
loadContracts(/* optional: diamond address */)
connectSigner(/* required: funded private key */)
```

# NPM Package
The core contracts in this repository are published in an NPM package for easy use within other repositories.

To install the npm package, run:
 ```shell
npm i @Heirtrust/heirtrust-v2-contracts
```

## Updating
Update the `version` at the top of package.json. Increment the third number (PATCH version) for bugfixes, the second number (MINOR version) for backwards compatible functionality additions, and the first number (MAJOR version) for breaking API changes. 
```shell
npm i
npm run prepublish
npm publish
```
Commit updated version to git

# Deploying / Upgrading Diamond Pattern on Goerli

*If the upgrade is run by a signer that is not the original diamond deployer, a new set of facets will be deployed*

- Update the package.json file’s version number with the abi version that will be published for the deployment
- In your .env file, set
  - `GOERLI_PROVIDER` to a valid goerli rpc node url
  - `SARCO_TOKEN_ADDRESS_GOERLI` to the address of the HRTToken contract on Goerli:  `0x4633b43990b41B57b3678c6F3Ac35bA75C3D8436`
  - `GOERLI_DEPLOYER_PRIVATE_KEY` to the address of the original deployer. If this is a new deployment:
    - Update the "name" of the diamond proxy in the deploy file (`await diamond.deploy("Diamond"`).
    - note that on a new deployment, the json deployment files under deployments/goerli/ will be updated with new contract addresses
- run `npx hardhat deploy --network goerli`
- publish the ABI package

```
npm i
npm run prepublish
npm publish
```

- update the web-app and archaeologist node to reference the new ABI package
