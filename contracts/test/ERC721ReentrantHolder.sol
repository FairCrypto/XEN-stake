// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "../XENStake.sol";

contract ERC721ReentrantHolder is IERC165, IERC721Receiver {
    XENStake public xenStake;

    constructor(address _xenTorrentAddress) {
        xenStake = XENStake(_xenTorrentAddress);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId;
    }

    function stakeXEN(uint256 amount, uint256 term) external {
        uint256 tokenId = xenStake.createStake(amount, term);
        require(tokenId > 0, "Unexpected tokenId received");
    }

    function onERC721Received(address, address from, uint256 tokenId, bytes calldata) external returns (bytes4) {
        xenStake.burn(from, tokenId);
        return IERC721Receiver.onERC721Received.selector;
    }
}
