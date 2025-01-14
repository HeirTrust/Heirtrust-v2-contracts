import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import time from "../test/utils/time";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  let hrtTokenAddress: string;

  const ethers = hre.ethers;

  const { deploy, diamond } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();

  // DAO agent address is the deployer for all networks except mainnet
  // In which case it is the HeirTrust Aragon Agent
  let daoAgentAddress = deployer;

  // Get the address of the HrtToken contract
  if (
    hre.hardhatArguments.network === "develop" ||
    hre.hardhatArguments.network === "localhost" ||
    hre.hardhatArguments.network === "ganache" ||
    !hre.hardhatArguments.network
  ) {
    const hrtToken = await hre.deployments.get("HeirTrustToken");
    hrtTokenAddress = hrtToken.address;
  } else if (["goerli", "goerli-fork"].includes(hre.hardhatArguments.network)) {
    hrtTokenAddress = "0x4633b43990b41B57b3678c6F3Ac35bA75C3D8436";
  } else if (["sepolia"].includes(hre.hardhatArguments.network)) {
    hrtTokenAddress = "0xfa1FA4d51FB2babf59e402c83327Ab5087441289";
  } else if (
    ["mainnet", "mainnet-fork"].includes(hre.hardhatArguments.network)
  ) {
    hrtTokenAddress = "0x7697b462a7c4ff5f8b55bdbc2f4076c2af9cf51a";

    // Mainnet DAO Agent Address
    daoAgentAddress = "0x2627e4c6beecbcb7ba0a5bb9861ec870dc86eb59";
  } else {
    throw Error(
      `HeirTrust is not set up for this network: ${hre.hardhatArguments.network}`
    );
  }

  // Default: 1% (100 / 10000)
  const protocolFeeBasePercentage = "100";

  // Default: 100% (10000 / 10000)
  const cursedBondPercentage = "10000";

  // Default: 1 Day
  const gracePeriod = time.duration.days(1);

  // Default 1 week
  const embalmerClaimWindow = time.duration.weeks(1);

  // Default 1 hour
  const expirationThreshold = time.duration.hours(1);

  await diamond.deploy("HeirTrust_V2", {
    from: deployer,
    owner: daoAgentAddress,
    facets: [
      "EmbalmerFacet",
      "ArchaeologistFacet",
      "ThirdPartyFacet",
      "ViewStateFacet",
      "AdminFacet",
    ],
    execute: {
      contract: "AppStorageInit",
      methodName: "init",
      args: [
        hrtTokenAddress,
        daoAgentAddress,
        protocolFeeBasePercentage,
        cursedBondPercentage,
        gracePeriod,
        embalmerClaimWindow,
        expirationThreshold,
      ],
    },
    log: true,
  });
};

func.dependencies = ["HRT"];

export default func;
