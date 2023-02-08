// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import "../storage/LibAppStorage.sol";
import "../libraries/LibTypes.sol";
import {LibErrors} from "./LibErrors.sol";

import "../facets/EmbalmerFacet.sol";

library LibBonds {
    /// @notice Decreases the amount stored in the freeBond mapping for an
    /// archaeologist. Reverts if the archaeologist's free bond is lower than
    /// the amount.
    /// @param archaeologist The address of the archaeologist whose
    /// free bond is being decreased
    /// @param amount The amount to decrease the free bond by
    function decreaseFreeBond(address archaeologist, uint256 amount) internal {
        AppStorage storage s = LibAppStorage.getAppStorage();

        // Revert if the amount is greater than the current free bond
        if (amount > s.archaeologistProfiles[archaeologist].freeBond) {
            revert LibErrors.NotEnoughFreeBond(
                s.archaeologistProfiles[archaeologist].freeBond,
                amount
            );
        }

        // Decrease the free bond amount
        s.archaeologistProfiles[archaeologist].freeBond -= amount;
    }

    /// @notice Increases the amount stored in the freeBond mapping for an
    /// archaeologist.
    /// @param archaeologist The address of the archaeologist whose
    /// free bond is being decreased
    /// @param amount The amount to decrease the free bond by
    function increaseFreeBond(address archaeologist, uint256 amount) internal {
        AppStorage storage s = LibAppStorage.getAppStorage();

        // Increase the free bond amount
        s.archaeologistProfiles[archaeologist].freeBond += amount;
    }

    /// @notice Decreases the amount stored in the cursedBond mapping for an
    /// archaeologist, without respectively increasing their free bond.
    /// @param archaeologist The address of the archaeologist
    /// @param amount The amount to slash
    function decreaseArchaeologistLockedBond(address archaeologist, uint256 amount) internal {
        AppStorage storage s = LibAppStorage.getAppStorage();

        // TDOD: Revert if the amount is greater than the current cursed bond
        if (amount > s.archaeologistProfiles[archaeologist].cursedBond) {
            revert LibErrors.NotEnoughCursedBond(
                s.archaeologistProfiles[archaeologist].cursedBond,
                amount
            );
        }

        s.archaeologistProfiles[archaeologist].cursedBond -= amount;
    }

    /// @notice Bonds the archaeologist to a sarcophagus.
    /// This does the following:
    ///   - adds the archaeologist's curse params and address to the sarcophagus
    ///   - calculates digging fees to be locked and later paid to archaeologist
    ///   - locks this amount from archaeologist's free bond; increases cursedBond by same
    ///   - Adds the sarcophagus' id to the archaeologist's record of bonded sarcophagi
    /// @param sarcoId Id of the sarcophagus with which to curse the archaeologist
    /// @param archaeologist The archaologist to curse, with associated parameters of the curse
    ///
    /// @return the amount of digging fees due the embalmer for this curse
    function curseArchaeologist(
        bytes32 sarcoId,
        EmbalmerFacet.CurseParams calldata archaeologist
    ) internal returns (uint256) {
        AppStorage storage s = LibAppStorage.getAppStorage();
        LibTypes.Sarcophagus storage sarcophagus = s.sarcophagi[sarcoId];

        sarcophagus.cursedArchaeologists[archaeologist.archAddress] = LibTypes.CursedArchaeologist({
            publicKey: archaeologist.publicKey,
            privateKey: 0,
            isAccused: false,
            diggingFeePerSecond: archaeologist.diggingFeePerSecond
        });
        sarcophagus.cursedArchaeologistAddresses.push(archaeologist.archAddress);

        // Calculate digging fees due for this time period (creationTime/previousRewrapTime -> resurrectionTime)
        uint256 diggingFeesDue = archaeologist.diggingFeePerSecond *
            (sarcophagus.resurrectionTime - sarcophagus.previousRewrapTime);

        decreaseFreeBond(archaeologist.archAddress, diggingFeesDue);
        s.archaeologistProfiles[archaeologist.archAddress].cursedBond += diggingFeesDue;

        s.archaeologistSarcophagi[archaeologist.archAddress].push(sarcoId);

        return diggingFeesDue;
    }

    /// @notice Calculates an archaeologist's cursed bond and frees them
    /// (unlocks the cursed bond).
    /// @param sarcoId the identifier of the sarcophagus to free the archaeologist from
    /// @param archaeologistAddress the address of the archaeologist to free
    function freeArchaeologist(bytes32 sarcoId, address archaeologistAddress) internal {
        AppStorage storage s = LibAppStorage.getAppStorage();
        LibTypes.Sarcophagus storage sarcophagus = s.sarcophagi[sarcoId];

        LibTypes.CursedArchaeologist storage cursedArchaeologist = s
            .sarcophagi[sarcoId]
            .cursedArchaeologists[archaeologistAddress];

        uint256 amount = cursedArchaeologist.diggingFeePerSecond *
            (sarcophagus.resurrectionTime - sarcophagus.previousRewrapTime);

        decreaseArchaeologistLockedBond(archaeologistAddress, amount);
        s.archaeologistProfiles[archaeologistAddress].freeBond += amount;
        s.archaeologistRewards[archaeologistAddress] += amount;
    }
}
