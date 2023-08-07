import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

module.exports = async ({ getNamedAccounts, deployments }) => {
  let heritageTokenAddress: string;

  const { deploy, diamond } = hre.deployments;
  const { deployer, signatory } = await hre.getNamedAccounts();

  const heritageTokenMock = await deploy("HeirTrustToken", {
    from: deployer,
    log: true,
    args: [],
  });
};

module.exports.tags = ["HRT"];
