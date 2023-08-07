// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HeirTrustToken is ERC20 {
    
    constructor() ERC20("HeirTrust", "HRT") {
        _mint(msg.sender, 10000000 ether);
        _mint(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266, 1000000  ether);
        _mint(0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199, 1000000  ether);
    }
}