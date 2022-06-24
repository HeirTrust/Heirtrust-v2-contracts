// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.13;

import {IDiamondCut} from "../interfaces/IDiamondCut.sol";

// The LibDiamond library as part of the diamond pattern
// EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535

/// @title A library managing adding, replacing, and removal of functions from
/// facets
/// @notice This library contains storage for the function locations and a
/// diamondCut function which adds, replaces, and removes functions from a facet
library LibDiamond {
    // The hash of a unique string. This hash is used as a pointer to the slot
    // of the diamond storage. The string may be any unique value.
    bytes32 public constant DIAMOND_STORAGE_POSITION =
        keccak256("diamond.standard.diamond.storage");

    // A struct that points to the facet contract a function belongs to and the
    // storage position of the function selector.
    // The selectorPosition is used when removing a function.
    struct FacetAddressAndSelectorPosition {
        address facetAddress;
        uint16 selectorPosition;
    }

    // Note: fields may also be added to DiamondInit.sol to be initialized
    struct DiamondStorage {
        // An array of function selectors
        bytes4[] selectors;
        // A mapping of the function selector to the face address and selector position
        mapping(bytes4 => LibDiamond.FacetAddressAndSelectorPosition) facetAddressAndSelectorPosition;
        mapping(bytes4 => bool) supportedInterfaces;
        address contractOwner;
    }

    /// @notice An event that emits when the ownership of the contract changes
    /// @param previousOwner The previous owner
    /// @param newOwner The new owner
    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    /// @notice An event that emits when a diamond is cut
    /// @dev Emitting this event is required to maintain a record of diamond cuts
    /// @param _diamondCut An array of facet cuts, each of which contains the
    /// facet address, the action, and an array of function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and
    /// arguments _calldata is executed with delegatecall on _init
    event DiamondCut(
        IDiamondCut.FacetCut[] _diamondCut,
        address _init,
        bytes _calldata
    );

    /// @notice A function that returns the diamond storage object
    /// @dev Looks up the diamond storage based on the DIAMOND_STORAGE_POSITION
    /// constant. This storage is used specifically for mainting diamond pattern
    /// state although any number of storages may be added.
    /// @return ds The diamond storage object
    function diamondStorage()
        internal
        pure
        returns (DiamondStorage storage ds)
    {
        // By default, solidity will store data in subsequent slots as defined
        // by the state variables. In the diamond pattern, the slot for diamond
        // storage is set explicitly. When doing so we need to ensure that the
        // slot has a unique address that will not conflict with anything else.
        //
        // To do this, we hash a unique string (DIAMOND_STORAGE_POSITION) which
        // can be thought of as a symbol for the storage slot and use this as
        // the storage slot. This ensures that nothing else in storage will
        // conflict with this storage location.
        bytes32 position = DIAMOND_STORAGE_POSITION;
        assembly {
            // Set the position of our struct in contract storage
            ds.slot := position
        }
    }

    /// @notice Sets the owner of the contract
    /// @param _newOwner The address of the new owner
    function setContractOwner(address _newOwner) internal {
        // Load diamond storage
        DiamondStorage storage ds = diamondStorage();

        // Get the previous owner
        address previousOwner = ds.contractOwner;

        // Set the new owner
        ds.contractOwner = _newOwner;

        // Emit an event
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    /// @notice A function that returns the contract owner
    /// @return contractOwner_ the address of the contract owner
    function contractOwner() internal view returns (address contractOwner_) {
        contractOwner_ = diamondStorage().contractOwner;
    }

    /// @notice A function that will revert if the sender is not the owner
    function enforceIsContractOwner() internal view {
        require(
            msg.sender == diamondStorage().contractOwner,
            "Must be contract owner"
        );
    }

    /// @notice Performs a diamond cut, a diamond pattern term that means add
    /// functions, replace function, or remove functions
    /// @dev This is the internal version of diamondCut
    /// @param _diamondCut An array of facet cuts, each of which contains the
    /// facet address, the action, and an array of function selectors
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and
    /// arguments _calldata is executed with delegatecall on _init
    function diamondCut(
        IDiamondCut.FacetCut[] memory _diamondCut,
        address _init,
        bytes memory _calldata
    ) internal {
        // For each diamond cut, perform the appropriate action based on
        // FacetCut.action
        for (
            uint256 facetIndex = 0;
            facetIndex < _diamondCut.length;
            facetIndex++
        ) {
            // Get the action of this diamond cut
            IDiamondCut.FacetCutAction action = _diamondCut[facetIndex].action;

            // Perform the appropriate action based on the action value
            if (action == IDiamondCut.FacetCutAction.Add) {
                addFunctions(
                    _diamondCut[facetIndex].facetAddress,
                    _diamondCut[facetIndex].functionSelectors
                );
            } else if (action == IDiamondCut.FacetCutAction.Replace) {
                replaceFunctions(
                    _diamondCut[facetIndex].facetAddress,
                    _diamondCut[facetIndex].functionSelectors
                );
            } else if (action == IDiamondCut.FacetCutAction.Remove) {
                removeFunctions(
                    _diamondCut[facetIndex].facetAddress,
                    _diamondCut[facetIndex].functionSelectors
                );
            } else {
                revert("Incorrect FacetCutAction");
            }
        }

        // Emit an event for diamond cut
        // This is needed to maintain a record of diamond cuts
        emit DiamondCut(_diamondCut, _init, _calldata);

        // Do some stuff after a diamond cut, like initializing storage variables
        postProcessDiamondCut(_init, _calldata);
    }

    /// @notice Adds functions to a facet
    /// @param _facetAddress the address of the facet contract
    /// @param _functionSelectors 4 byte selectors of the functions to be added
    function addFunctions(
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        // Check that there are functions to be added
        require(_functionSelectors.length > 0, "No selectors in facet to cut");

        // Make sure facet address is not address(0). Setting the _facetAddress
        // to address(0) is how we remove functions
        require(_facetAddress != address(0), "Facet can't be address(0)");

        // Make sure the facet actually has code
        enforceHasContractCode(_facetAddress, "Facet has no code");

        // Load diamond storage
        DiamondStorage storage ds = diamondStorage();

        // For each function, add it to the facet
        uint16 selectorCount = uint16(ds.selectors.length);
        for (
            uint256 selectorIndex = 0;
            selectorIndex < _functionSelectors.length;
            selectorIndex++
        ) {
            bytes4 selector = _functionSelectors[selectorIndex];

            // Make sure function selector does not already exist.
            // This is done by checking if the facet address on the
            // FacetAddressAndSelectorPosition object exists
            address oldFacetAddress = ds
                .facetAddressAndSelectorPosition[selector]
                .facetAddress;
            require(
                oldFacetAddress == address(0),
                "That function already exists"
            );

            // Add the function selector to the latest position in storage
            ds.facetAddressAndSelectorPosition[
                    selector
                ] = FacetAddressAndSelectorPosition(
                _facetAddress,
                selectorCount
            );

            // Add the function selector to the selectors array
            ds.selectors.push(selector);

            // Increment the selector count
            selectorCount++;
        }
    }

    /// @notice Replaces existing functions on a facet
    /// @param _facetAddress The address of the facet contract
    /// @param _functionSelectors 4 byte selectors of the functions to replace
    /// old ones
    function replaceFunctions(
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        // Check that there are functions that will do the replacing
        require(_functionSelectors.length > 0, "No selectors in facet to cut");

        // Make sure facet address is not address(0)
        require(_facetAddress != address(0), "Facet can't be address(0)");

        // Make sure the facet actually has code
        enforceHasContractCode(_facetAddress, "Facet has no code");

        // Load diamond storage
        DiamondStorage storage ds = diamondStorage();

        // For each function, replace the existing function
        for (
            uint256 selectorIndex = 0;
            selectorIndex < _functionSelectors.length;
            selectorIndex++
        ) {
            bytes4 selector = _functionSelectors[selectorIndex];

            // Get the old facet address
            address oldFacetAddress = ds
                .facetAddressAndSelectorPosition[selector]
                .facetAddress;

            // Make sure the functions being replaced don't exist directly on
            // the diamond. These functions are immutable.
            require(
                oldFacetAddress != address(this),
                "Can't replace immutable function"
            );

            // Make sure the facet address is different from the old facet address
            require(
                oldFacetAddress != _facetAddress,
                "That function already exists"
            );

            // Make sure that the function being replaced actually exists
            require(oldFacetAddress != address(0), "Function doesn't exist");

            // Replace old facet address
            ds
                .facetAddressAndSelectorPosition[selector]
                .facetAddress = _facetAddress;
        }
    }

    /// @notice Removes functions from a facet
    /// @dev The empty storage slots left from removed functions are replaced
    /// with the lastest functions in storage. Functions are removed by setting
    /// their facet address to address(0)
    /// @param _facetAddress The address of the facet contract
    /// @param _functionSelectors 4 byte selectors of the functions to remove
    function removeFunctions(
        address _facetAddress,
        bytes4[] memory _functionSelectors
    ) internal {
        // Check that there are functions to be removed
        require(_functionSelectors.length > 0, "No selectors in facet to cut");

        // Make sure the facet address is address(0)
        require(
            _facetAddress == address(0),
            "Facet address must be address(0)"
        );

        // Load diamond storage
        DiamondStorage storage ds = diamondStorage();

        // For each function remove it from the facet
        uint256 selectorCount = ds.selectors.length;
        for (
            uint256 selectorIndex = 0;
            selectorIndex < _functionSelectors.length;
            selectorIndex++
        ) {
            bytes4 selector = _functionSelectors[selectorIndex];

            // Get the old facet address and selector position
            FacetAddressAndSelectorPosition
                memory oldFacetAddressAndSelectorPosition = ds
                    .facetAddressAndSelectorPosition[selector];

            // Check that functions exists by checking if it has a facet address
            require(
                oldFacetAddressAndSelectorPosition.facetAddress != address(0),
                "Function doesn't exist"
            );

            // Make sure we are not trying to remove a function defined directly
            // in the diamond contract. These functions are immutable
            require(
                oldFacetAddressAndSelectorPosition.facetAddress !=
                    address(this),
                "Can't remove immutable function."
            );

            // The removal of the function selector leaves an empty slot in
            // storage. Replace that slot with the latest function in storage.
            selectorCount--;
            if (
                oldFacetAddressAndSelectorPosition.selectorPosition !=
                selectorCount
            ) {
                bytes4 lastSelector = ds.selectors[selectorCount];
                ds.selectors[
                    oldFacetAddressAndSelectorPosition.selectorPosition
                ] = lastSelector;
                ds
                    .facetAddressAndSelectorPosition[lastSelector]
                    .selectorPosition = oldFacetAddressAndSelectorPosition
                    .selectorPosition;
            }

            // Delete last selector
            ds.selectors.pop();
            delete ds.facetAddressAndSelectorPosition[selector];
        }
    }

    /// @notice Post processing on a diamond cut
    /// @dev At this point the diamond cut has already been performed. This
    /// calls whatever initializing functions need to be called after the
    /// diamond cut happens, like intializing data for example.
    ///
    /// Example:
    ///     _init = DiamondInit.address
    ///     _calldata = the function selector for the `init()` function
    ///     This will do a delegate call on DiamondInit.init()
    ///
    /// @param _init The address of the contract or facet to execute _calldata
    /// @param _calldata A function call, including function selector and
    /// arguments _calldata is executed with delegatecall on _init
    function postProcessDiamondCut(address _init, bytes memory _calldata)
        internal
    {
        // If _init is address(0) then calldata should be empty and post
        // processing will be skipped
        if (_init == address(0)) {
            require(_calldata.length == 0, "_calldata should be empty");
        } else {
            // If _init is not address(0) then there should be something in _calldata
            require(_calldata.length > 0, "_calldata is empty");

            // In this case address(this) is the Diamond.sol contract address.
            // Make sure the caller is not trying to call a function on the
            // Diamond.sol contract
            if (_init != address(this)) {
                // Make sure the contract has a function to call
                enforceHasContractCode(_init, "_init address has no code");

                // Call the function defined in _calldata using delegatecall
                // solhint-disable-next-line avoid-low-level-calls
                (bool success, bytes memory error) = _init.delegatecall(
                    _calldata
                );

                if (!success) {
                    if (error.length > 0) {
                        // Bubble the error up
                        revert(string(error));
                    } else {
                        revert("_init function reverted");
                    }
                }
            }
        }
    }

    /// @notice Checks that a facet has actual contract code
    /// @param _contract The address of the contract
    /// @param _errorMessage The error message to be thrown if reverted
    function enforceHasContractCode(
        address _contract,
        string memory _errorMessage
    ) internal view {
        // Checks that the contract size is greater than 0
        uint256 contractSize;
        assembly {
            contractSize := extcodesize(_contract)
        }
        require(contractSize > 0, _errorMessage);
    }
}