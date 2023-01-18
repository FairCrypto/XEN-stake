// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "../XENStake.sol";

contract ERC721NonHolder is IERC721Receiver {
    XENStake public xenStake;

    constructor(address _xenTorrentAddress) {
        xenStake = XENStake(_xenTorrentAddress);
    }

    function stakeXEN(uint256 amount, uint256 term) external {
        uint256 tokenId = xenStake.createStake(amount, term);
        require(tokenId > 0, "Unexpected tokenId received");
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return bytes4(0x12345678);
    }
}
