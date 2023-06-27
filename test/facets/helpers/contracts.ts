import { Contract } from "ethers";
import {
  AdminFacet,
  ArchaeologistFacet,
  EmbalmerFacet,
  SarcoTokenMock,
  ThirdPartyFacet,
  ViewStateFacet,
} from "../../../typechain";

const { ethers } = require("hardhat");

/**
 * Returns all contracts
 * */
export const getContracts = async (): Promise<{
  diamond: Contract;
  sarcoToken: SarcoTokenMock;
  embalmerFacet: EmbalmerFacet;
  archaeologistFacet: ArchaeologistFacet;
  thirdPartyFacet: ThirdPartyFacet;
  viewStateFacet: ViewStateFacet;
  adminFacet: AdminFacet;
}> => {
  const diamond = await ethers.getContract("Sarcophagus_V2_DiamondProxy");

  return {
    diamond,
    sarcoToken: await ethers.getContract("SarcoTokenMock"),
    embalmerFacet: await ethers.getContractAt("EmbalmerFacet", diamond.address),
    archaeologistFacet: await ethers.getContractAt(
      "ArchaeologistFacet",
      diamond.address
    ),
    thirdPartyFacet: await ethers.getContractAt(
      "ThirdPartyFacet",
      diamond.address
    ),
    viewStateFacet: await ethers.getContractAt(
      "ViewStateFacet",
      diamond.address
    ),
    adminFacet: await ethers.getContractAt("AdminFacet", diamond.address),
  };
};
