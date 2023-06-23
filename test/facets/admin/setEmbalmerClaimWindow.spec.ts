import { accountGenerator } from "../helpers/accounts";
import { getContracts } from "../helpers/contracts";
import { expect } from "chai";

const { deployments, ethers } = require("hardhat");

describe("AdminFacet.setEmbalmerClaimWindow", () => {
  context("when caller is not the admin", async () => {
    beforeEach(async () => {
      process.env.ADMIN_ADDRESS = "0x1ABC7154748D1CE5144478CDEB574AE244B939B5";
      await deployments.fixture();
      accountGenerator.index = 0;
      delete process.env.ADMIN_ADDRESS;
    });

    it("reverts with the correct error message", async () => {
      const { adminFacet } = await getContracts();
      const deployer = await ethers.getNamedSigner("deployer");
      expect(
        await adminFacet.connect(deployer).setEmbalmerClaimWindow(200)
      ).to.be.revertedWithCustomError(adminFacet, "CallerIsNotAdmin");
    });
  });

  beforeEach(async () => {
    await deployments.fixture();
    accountGenerator.index = 0;
  });

  it("defaults embalmerClaimWindow to 604800", async () => {
    const { viewStateFacet } = await getContracts();
    const signers = await ethers.getSigners();

    const embalmerClaimWindow = await viewStateFacet
      .connect(signers[0])
      .getEmbalmerClaimWindow();
    expect(embalmerClaimWindow).to.eq(604800);
  });

  it("sets the grace period if caller is owner", async () => {
    const { adminFacet, viewStateFacet } = await getContracts();
    const deployer = await ethers.getNamedSigner("deployer");
    await adminFacet.connect(deployer).setEmbalmerClaimWindow(200);

    const embalmerClaimWindow = await viewStateFacet
      .connect(deployer)
      .getEmbalmerClaimWindow();
    expect(embalmerClaimWindow).to.eq(200);
  });

  it("emits setEmbalmerClaimWindow", async () => {
    const { adminFacet } = await getContracts();
    const deployer = await ethers.getNamedSigner("deployer");
    const tx = adminFacet.connect(deployer).setEmbalmerClaimWindow(200);
    // @ts-ignore
    await expect(tx).to.emit(adminFacet, `SetEmbalmerClaimWindow`);
  });

  it("reverts when a non-owner is the caller", async () => {
    const { adminFacet } = await getContracts();
    const signers = await ethers.getSigners();
    const tx = adminFacet.connect(signers[1]).setEmbalmerClaimWindow(200);

    // @ts-ignore
    await expect(tx).to.be.reverted;
  });
});
