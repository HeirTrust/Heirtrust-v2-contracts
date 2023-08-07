// Transfer 10,000 HRT tokens to an address
// transferAddress defaults to the first unnamed hardhat local node account
const amountToTransfer = "10000000000000000000000";
let mockTokenAddress = "0x548e7588C7eb521B71Ed882982094ca414885B8a";

const hre = require("hardhat");

// Add supported networks to this list on a need basis
const allowedNetworks = ["localhost"];

(async () => {
  if (!allowedNetworks.includes(hre.hardhatArguments.network)) {
    throw new Error(
      `Transfer script is meant to be used on these networks only:\n${allowedNetworks}\n`
    );
  }

  const hrtTokenDeployment = await hre.deployments.get("HeirTrustToken");
  mockTokenAddress = hrtTokenDeployment.address;

  const hrtToken = await hre.ethers.getContractAt(
    "HeirTrustToken",
    mockTokenAddress
  );
  const unsignedAccounts = await hre.getUnnamedAccounts();

  const transferAddress = process.env.TRANSFER_ADDRESS || unsignedAccounts[0];

  await hrtToken.transfer(
    transferAddress,
    hre.ethers.BigNumber.from(amountToTransfer)
  );

  const newBalance = await hrtToken.balanceOf(transferAddress);
  console.log("account balance:", newBalance.toString());
})();
