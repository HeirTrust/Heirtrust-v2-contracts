// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HeirTrustTokenMock is ERC20 {
    constructor() ERC20("HRTMock", "HeirTrust Mock") {
        _mint(msg.sender, 100 * 10**6 * 10**18);
    }
}
