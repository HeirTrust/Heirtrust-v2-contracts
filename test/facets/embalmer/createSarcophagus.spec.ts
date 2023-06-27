import "@nomicfoundation/hardhat-chai-matchers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import time from "../../utils/time";
import { accountGenerator } from "../helpers/accounts";
import {
  ArchaeologistData,
  createArchSignature,
} from "../helpers/archaeologistSignature";
import {
  getArchaeologistFreeBondSarquitos,
  getArchaeologistLockedBondSarquitos,
} from "../helpers/bond";
import { getContracts } from "../helpers/contracts";
import {
  buildCreateSarcophagusArgs,
  createSarcophagusData,
  createSarcophagusWithRegisteredCursedArchaeologists,
  curseFee,
  diggingFeesPerSecond_10_000_SarcoMonthly,
  registerDefaultArchaeologistsAndCreateSignatures,
} from "../helpers/sarcophagus";
import { getSarquitoBalance } from "../helpers/sarcoToken";
import { getAllFeesSarquitos } from "../helpers/diggingFees";

const crypto = require("crypto");
const { deployments } = require("hardhat");

describe("EmbalmerFacet.createSarcophagus", () => {
  // reset to directly after the diamond deployment before each test
  beforeEach(async () => {
    await deployments.fixture();
    accountGenerator.index = 0;
  });

  describe("Validates parameters", function () {
    it("Should revert if supplied expired sarcophagus parameters", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});
      // set an expired creationTime
      sarcophagusData.creationTimeSeconds =
        (await time.latest()) - time.duration.weeks(12);

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `SarcophagusParametersExpired`
      );
    });

    it("Should revert if supplied resurrection time that has passed", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});
      // set current time to resurrectionTime
      await time.increaseTo(sarcophagusData.resurrectionTimeSeconds);
      // update creationTime so sarcophagus parameters are not expired
      sarcophagusData.creationTimeSeconds = await time.latest();
      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `ResurrectionTimeInPast`
      );
    });

    it("Should revert if supplied resurrection time is after maximumRewrapInterval", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});
      // set resurrectionTime to be greater than maximumRewrapInterval
      sarcophagusData.resurrectionTimeSeconds =
        (await time.latest()) +
        sarcophagusData.maximumRewrapIntervalSeconds +
        time.duration.minutes(1);
      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `ResurrectionTimeTooFarInFuture`
      );
    });

    it("should revert if supplied resurrection time is greater than max resurrection time", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      // set max resurrection time to a value less than resurrection time
      sarcophagusData.maximumResurrectionTimeSeconds =
        (await time.latest()) + time.duration.minutes(1);

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `ResurrectionTimePastMaxResurrectionTime`
      );
    });

    it("Should revert if no archaeologists are supplied", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({
        threshold: 1,
        totalArchaeologists: 1,
        maximumRewrapIntervalSeconds: time.duration.weeks(4),
      });

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(...buildCreateSarcophagusArgs(sarcophagusData, []));

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `NoArchaeologistsProvided`
      );
    });

    it("Should revert if supplied threshold is zero", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({
        threshold: 1,
        totalArchaeologists: 1,
        maximumRewrapIntervalSeconds: time.duration.weeks(4),
      });

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);
      sarcophagusData.threshold = 0;
      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `ThresholdCannotBeZero`
      );
    });

    it("Should revert if supplied threshold is greater than total number of archaeologists", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({
        threshold: 1,
        totalArchaeologists: 1,
        maximumRewrapIntervalSeconds: time.duration.weeks(4),
      });
      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      sarcophagusData.threshold = 2;
      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );
      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `ThresholdGreaterThanTotalNumberOfArchaeologists`
      );
    });

    it("Should revert if one of the supplied archaeologists doesn't have a registered profile", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});
      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      const unregisteredArchaeologistData = await createArchSignature(
        await accountGenerator.newAccount(),
        {
          publicKey: sarcophagusData.publicKeys[0],
          privateKey: sarcophagusData.privateKeys[0],
          maximumRewrapIntervalSeconds:
            sarcophagusData.maximumRewrapIntervalSeconds,
          maximumResurrectionTimeSeconds:
            sarcophagusData.maximumResurrectionTimeSeconds,
          creationTime: sarcophagusData.creationTimeSeconds,
          diggingFeePerSecondSarquito: diggingFeesPerSecond_10_000_SarcoMonthly,
          curseFee: curseFee,
        }
      );
      archaeologists[0] = unregisteredArchaeologistData;
      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `ArchaeologistProfileExistsShouldBe`
      );
    });

    it("Should revert if the archaeologist list contains duplicates", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});
      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      const duplicateArchaeologist = await createArchSignature(
        // reuse signer from first archaeologist
        await ethers.getSigner(archaeologists[0].archAddress),
        {
          publicKey: sarcophagusData.publicKeys[1],
          privateKey: sarcophagusData.privateKeys[1],
          maximumRewrapIntervalSeconds:
            sarcophagusData.maximumRewrapIntervalSeconds,
          maximumResurrectionTimeSeconds:
            sarcophagusData.maximumResurrectionTimeSeconds,
          creationTime: sarcophagusData.creationTimeSeconds,
          diggingFeePerSecondSarquito: diggingFeesPerSecond_10_000_SarcoMonthly,
          curseFee: curseFee,
        }
      );
      archaeologists[1] = duplicateArchaeologist;
      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `ArchaeologistListContainsDuplicate`
      );
    });

    it("Should revert if one of the supplied public keys has already been used", async function () {
      const { embalmerFacet } = await getContracts();

      // Go through a full sarcophagus creation first
      const { createdSarcophagusData } =
        await createSarcophagusWithRegisteredCursedArchaeologists();

      // Prepare a new sarcophagus to be created
      const newSarcophagusData = await createSarcophagusData({});

      // Register new archaologists and have them sign off on previously created sarcophagus data
      // (effectively reusing its public keys)
      const archaeologistsOnOldSarco =
        await registerDefaultArchaeologistsAndCreateSignatures(
          createdSarcophagusData
        );

      const tx = embalmerFacet
        .connect(createdSarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(
            newSarcophagusData,
            archaeologistsOnOldSarco
          )
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `DuplicatePublicKey`
      );
    });
  });
  describe("Validates archaeologist signatures", function () {
    it("Should revert if an archaeologist has not signed off on their assigned publicKey", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);
      // alter publicKey being supplied to the create call after signatures are generated using the original value
      archaeologists[0].publicKey = new ethers.utils.SigningKey(
        "0x" + crypto.randomBytes(32).toString("hex")
      ).publicKey;

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `InvalidSignature`
      );
    });

    it("Should revert if an archaeologist has not signed off on their assigned diggingFee", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      // alter diggingFeeSarquitos being supplied to the create call after signatures are generated using the original value
      archaeologists[0].diggingFeePerSecondSarquito =
        ethers.utils.parseEther("800");

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `InvalidSignature`
      );
    });

    it("Should revert if an archaeologist has not signed off on the sarcophagus creationTime", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);
      // alter creationTime being supplied to the create call after signatures are generated using the original value
      sarcophagusData.creationTimeSeconds = (await time.latest()) - 10;

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `InvalidSignature`
      );
    });

    it("Should revert if an archaeologist has not signed off on the sarcophagus maximumRewrapIntervalSeconds", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);
      // alter maximumRewrapInterval being supplied to the create call after signatures are generated using the original value
      sarcophagusData.maximumRewrapIntervalSeconds =
        sarcophagusData.maximumRewrapIntervalSeconds + 1;

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `InvalidSignature`
      );
    });
    it("Should revert if an archaeologist has not signed off on the sarcophagus maximumResurectionTime", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);
      // alter maximumRewrapInterval being supplied to the create call after signatures are generated using the original value
      sarcophagusData.maximumResurrectionTimeSeconds =
        sarcophagusData.maximumResurrectionTimeSeconds - 1;

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      await expect(tx).to.be.revertedWithCustomError(
        embalmerFacet,
        `InvalidSignature`
      );
    });
  });

  describe("Successfully creates a sarcophagus", function () {
    it("Should lock bond equal to the digging fee that will be paid to the archaeologist", async function () {
      const { embalmerFacet, viewStateFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      // save starting free and locked bonds for all archaeologists
      const startingArchaeologistBonds = await Promise.all(
        archaeologists.map(async (archaeologist: ArchaeologistData) => ({
          freeBond: await getArchaeologistFreeBondSarquitos(
            archaeologist.archAddress
          ),
          lockedBond: await getArchaeologistLockedBondSarquitos(
            archaeologist.archAddress
          ),
        }))
      );

      await embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      const cursedBondPercentage = await viewStateFacet
        .connect(sarcophagusData.embalmer)
        .getCursedBondPercentage();

      // check post curse bond on all archaeologists
      await Promise.all(
        archaeologists.map(
          async (archaeologist: ArchaeologistData, index: number) => {
            const archaeologistPostCurseFreeBond =
              await getArchaeologistFreeBondSarquitos(
                archaeologist.archAddress
              );
            const archaeologistPostCurseLockedBond =
              await getArchaeologistLockedBondSarquitos(
                archaeologist.archAddress
              );

            const diggingFeesDue = BigNumber.from(
              archaeologist.diggingFeePerSecondSarquito
            )
              .mul(
                sarcophagusData.resurrectionTimeSeconds -
                  sarcophagusData.creationTimeSeconds
              )
              .add(archaeologist.curseFee);

            const cursedBondAmount = diggingFeesDue
              .mul(cursedBondPercentage)
              .div(10000);

            expect(archaeologistPostCurseFreeBond).to.equal(
              startingArchaeologistBonds[index].freeBond.sub(cursedBondAmount)
            );

            expect(archaeologistPostCurseLockedBond).to.equal(
              startingArchaeologistBonds[index].lockedBond.add(cursedBondAmount)
            );
          }
        )
      );
    });

    it("Should charge the embalmer the total of all digging fees plus the protocol fees", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      // save starting embalmer balance
      const startingEmbalmerSarquitoBalance = await getSarquitoBalance(
        sarcophagusData.embalmer.address
      );

      await embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );

      const postCreationSarquitoBalance = await getSarquitoBalance(
        sarcophagusData.embalmer.address
      );

      const totalCostToEmbalmer = await getAllFeesSarquitos(
        archaeologists,
        sarcophagusData.resurrectionTimeSeconds -
          sarcophagusData.creationTimeSeconds
      );
      expect(postCreationSarquitoBalance).to.equal(
        startingEmbalmerSarquitoBalance.sub(totalCostToEmbalmer)
      );
    });

    it("Should store all selected archaeologists on the newly created sarcophagus", async function () {
      const { viewStateFacet } = await getContracts();
      const {
        cursedArchaeologists: archaeologists,
        createdSarcophagusData: sarcophagusData,
      } = await createSarcophagusWithRegisteredCursedArchaeologists();

      const sarcophagusResult = await viewStateFacet.getSarcophagus(
        sarcophagusData.sarcoId
      );
      expect(sarcophagusResult.archaeologistAddresses).to.deep.equal(
        archaeologists.map((a) => a.archAddress)
      );
    });

    it("Should store all supplied sarcophagus parameters on the newly created sarcophagus", async function () {
      const { viewStateFacet } = await getContracts();
      const { createdSarcophagusData: sarcophagusData } =
        await createSarcophagusWithRegisteredCursedArchaeologists();

      const sarcophagusResult = await viewStateFacet.getSarcophagus(
        sarcophagusData.sarcoId
      );
      expect(sarcophagusResult.resurrectionTime).to.equal(
        sarcophagusData.resurrectionTimeSeconds
      );
      expect(sarcophagusResult.name).to.equal(sarcophagusData.name);
      expect(sarcophagusResult.threshold).to.equal(sarcophagusData.threshold);
      expect(sarcophagusResult.maximumRewrapInterval).to.equal(
        sarcophagusData.maximumRewrapIntervalSeconds
      );
      expect(sarcophagusResult.embalmerAddress).to.equal(
        sarcophagusData.embalmer.address
      );
      expect(sarcophagusResult.recipientAddress).to.equal(
        sarcophagusData.recipientAddress
      );

      expect(sarcophagusResult.isCompromised).to.equal(false);
      expect(sarcophagusResult.publishedPrivateKeyCount).to.equal(0);
      expect(sarcophagusResult.hasLockedBond).to.equal(true);
    });

    it("Should update convenience lookup data structures with the new sarcophagus", async function () {
      const { viewStateFacet } = await getContracts();
      const {
        cursedArchaeologists: archaeologists,
        createdSarcophagusData: sarcophagusData,
      } = await createSarcophagusWithRegisteredCursedArchaeologists();

      const archaeologistSarcophagi =
        await viewStateFacet.getArchaeologistSarcophagi(
          archaeologists[0].archAddress
        );
      expect(archaeologistSarcophagi).contains(sarcophagusData.sarcoId);

      const embalmerSarcophagi = await viewStateFacet.getEmbalmerSarcophagi(
        sarcophagusData.embalmer.address
      );
      expect(embalmerSarcophagi).contains(sarcophagusData.sarcoId);

      const recipientSarcophagi = await viewStateFacet.getRecipientSarcophagi(
        sarcophagusData.recipientAddress
      );
      expect(recipientSarcophagi).contains(sarcophagusData.sarcoId);
    });

    it("Should emit CreateSarcophagus", async function () {
      const { embalmerFacet } = await getContracts();
      const sarcophagusData = await createSarcophagusData({});

      const archaeologists =
        await registerDefaultArchaeologistsAndCreateSignatures(sarcophagusData);

      const tx = embalmerFacet
        .connect(sarcophagusData.embalmer)
        .createSarcophagus(
          ...buildCreateSarcophagusArgs(sarcophagusData, archaeologists)
        );
      await expect(tx).to.emit(embalmerFacet, "CreateSarcophagus");
    });
  });
});
