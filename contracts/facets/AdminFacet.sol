// SPDX-License-Identifier: Unlicense

pragma solidity 0.8.18;

import "../storage/LibAppStorage.sol";

import {LibDiamond} from "hardhat-deploy/solc_0.8/diamond/libraries/LibDiamond.sol";

/// @notice Caller of any function in this facet must be the admin address
contract AdminFacet {
    using SafeERC20 for IERC20;

    event SetProtocolFeeBasePercentage(uint256 protocolFeeBasePercentage);
    event SetCursedBondPercentage(uint256 cursedBondPercentage);
    event WithdrawProtocolFees(uint256 totalProtocolFees);
    event SetGracePeriod(uint256 gracePeriod);
    event SetEmbalmerClaimWindow(uint256 embalmerClaimWindow);
    event SetExpirationThreshold(uint256 expirationThreshold);

    /// @notice Admin has attempted to set a zero value
    error CannotSetZeroValue();

    /// @notice Caller must be the admin address
    error CallerIsNotAdmin();

    /// @notice Withdraws the total protocol fee amount from the contract.
    function withdrawProtocolFees() external {
        AppStorage storage s = LibAppStorage.getAppStorage();

        if (msg.sender != s.admin) {
            revert CallerIsNotAdmin();
        }

        // Get the total protocol fees from storage
        uint256 totalProtocolFees = s.totalProtocolFees;

        // Set the total protocol fees to 0 before the transfer to avoid reentrancy
        s.totalProtocolFees = 0;

        // Transfer the protocol fee amount to the sender after setting state
        s.sarcoToken.safeTransfer(msg.sender, totalProtocolFees);

        emit WithdrawProtocolFees(totalProtocolFees);
    }

    /// @notice Sets the protocol fee base percentage, used to calculate protocol fees
    /// @param protocolFeeBasePercentage percentage to set
    function setProtocolFeeBasePercentage(uint256 protocolFeeBasePercentage) external {
        AppStorage storage s = LibAppStorage.getAppStorage();
        if (msg.sender != s.admin) {
            revert CallerIsNotAdmin();
        }
        s.protocolFeeBasePercentage = protocolFeeBasePercentage;
        emit SetProtocolFeeBasePercentage(protocolFeeBasePercentage);
    }

    /// @notice Sets the digging fee / cursed bond ratio
    /// used to calculate how much bond archaeologists must lock per curse.
    /// @param cursedBondPercentage ratio to set.
    /// @dev Can only be called by the owner.
    function setCursedBondPercentage(uint256 cursedBondPercentage) external {
        AppStorage storage s = LibAppStorage.getAppStorage();
        if (msg.sender != s.admin) {
            revert CallerIsNotAdmin();
        }
        if (cursedBondPercentage == 0) {
            revert CannotSetZeroValue();
        }
        s.cursedBondPercentage = cursedBondPercentage;
        emit SetCursedBondPercentage(cursedBondPercentage);
    }

    /// @notice Updates the resurrection grace period
    /// @param gracePeriod to set
    /// @dev Can only be called by the diamond owner.
    function setGracePeriod(uint256 gracePeriod) external {
        AppStorage storage s = LibAppStorage.getAppStorage();
        if (msg.sender != s.admin) {
            revert CallerIsNotAdmin();
        }
        s.gracePeriod = gracePeriod;
        emit SetGracePeriod(gracePeriod);
    }

    /// @notice Updates the embalmerClaimWindow
    /// @param embalmerClaimWindow to set
    function setEmbalmerClaimWindow(uint256 embalmerClaimWindow) external {
        AppStorage storage s = LibAppStorage.getAppStorage();
        if (msg.sender != s.admin) {
            revert CallerIsNotAdmin();
        }
        s.embalmerClaimWindow = embalmerClaimWindow;
        emit SetEmbalmerClaimWindow(embalmerClaimWindow);
    }

    /// @notice Updates the expirationThreshold used during sarcophagus creation
    /// @param expirationThreshold to set
    function setExpirationThreshold(uint256 expirationThreshold) external {
        AppStorage storage s = LibAppStorage.getAppStorage();
        if (msg.sender != s.admin) {
            revert CallerIsNotAdmin();
        }
        s.expirationThreshold = expirationThreshold;
        emit SetExpirationThreshold(expirationThreshold);
    }
}
