// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/interfaces/IERC165.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC721Receiver.sol";
import "../XENStake.sol";

contract ERC721Holder is IERC165, IERC721Receiver {
    XENCrypto public xenCrypto;
    XENStake public xenStake;

    constructor(address _xenCryptoAddress, address _xenTorrentAddress) {
        xenCrypto = XENCrypto(_xenCryptoAddress);
        xenStake = XENStake(_xenTorrentAddress);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC721Receiver).interfaceId;
    }

    function stakeXEN(uint256 amount, uint256 term) external {
        uint256 tokenId = xenStake.createStake(amount, term);
        require(tokenId > 0, "Unexpected tokenId received");
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
