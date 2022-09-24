import { createSarcoFixture } from "../fixtures/create-sarco-fixture";
import { BigNumber } from "ethers";
import { expect } from "chai";

const shares = 5;
const threshold = 3;
const sarcoName = "test init";

describe("AdminFacet", () => {
  describe("setProtocolFee", () => {
    it("allows deployer of diamond contract to set the protocol fee", async () => {
      const { deployer, adminFacet, viewStateFacet } = await createSarcoFixture({shares, threshold}, sarcoName);

      const newProtocolFee = BigNumber.from("12");
      await adminFacet.connect(deployer).setProtocolFeeBasePercentage(newProtocolFee);
      const protocolFee = await viewStateFacet.connect(deployer).getProtocolFeeBasePercentage();

      expect(
        newProtocolFee
      ).to.equal(
        protocolFee
      )
    });

    it("reverts if non-deployer (owner) attempts to set the protocol fee", async () => {
      const { embalmer, adminFacet } = await createSarcoFixture({shares, threshold}, sarcoName);

      const protocolFee = BigNumber.from("12");
      await expect (
        adminFacet.connect(embalmer).setProtocolFeeBasePercentage(protocolFee)
      ).to.be.revertedWith("LibDiamond: Must be contract owner");
    })
  })
})

