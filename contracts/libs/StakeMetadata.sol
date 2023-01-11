// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./StakeInfo.sol";
import "./DateTime.sol";
import "./FormattedStrings.sol";
import "./StakeSVG.sol";

/**
    @dev Library contains methods to generate on-chain NFT metadata
*/
library StakeMetadata {
    using DateTime for uint256;
    using StakeInfo for uint256;
    using Strings for uint256;

    uint256 public constant POWER_GROUP_SIZE = 7_500;
    uint256 public constant MAX_POWER = 52_500;

    uint256 public constant COLORS_FULL_SCALE = 300;
    uint256 public constant SPECIAL_LUMINOSITY = 45;
    uint256 public constant BASE_SATURATION = 75;
    uint256 public constant BASE_LUMINOSITY = 38;
    uint256 public constant GROUP_SATURATION = 100;
    uint256 public constant GROUP_LUMINOSITY = 50;
    uint256 public constant DEFAULT_OPACITY = 1;
    uint256 public constant NO_COLOR = 360;

    // PRIVATE HELPERS

    // The following pure methods returning arrays are workaround to use array constants,
    // not yet available in Solidity

    function _powerGroupColors() private pure returns (uint256[8] memory) {
        return [uint256(360), 1, 30, 60, 120, 180, 240, 300];
    }

    function _huesApex() private pure returns (uint256[3] memory) {
        return [uint256(169), 210, 305];
    }

    function _huesLimited() private pure returns (uint256[3] memory) {
        return [uint256(263), 0, 42];
    }

    function _stopOffsets() private pure returns (uint256[3] memory) {
        return [uint256(10), 50, 90];
    }

    function _gradColorsRegular() private pure returns (uint256[4] memory) {
        return [uint256(150), 150, 20, 20];
    }

    function _gradColorsBlack() private pure returns (uint256[4] memory) {
        return [uint256(100), 100, 20, 20];
    }

    function _gradColorsSpecial() private pure returns (uint256[4] memory) {
        return [uint256(100), 100, 0, 0];
    }

    /**
        @dev private helper to determine XENFT group index by its power
             (power = count of VMUs * mint term in days)
     */
    function _powerGroup(uint256 vmus, uint256 term) private pure returns (uint256) {
        return (vmus * term) / POWER_GROUP_SIZE;
    }

    /**
        @dev private helper to generate SVG gradients for special XENFT categories
     */
    function _specialClassGradients(bool rare) private pure returns (StakeSVG.Gradient[] memory gradients) {
        uint256[3] memory specialColors = rare ? _huesApex() : _huesLimited();
        StakeSVG.Color[] memory colors = new StakeSVG.Color[](3);
        for (uint256 i = 0; i < colors.length; i++) {
            colors[i] = StakeSVG.Color({
                h: specialColors[i],
                s: BASE_SATURATION,
                l: SPECIAL_LUMINOSITY,
                a: DEFAULT_OPACITY,
                off: _stopOffsets()[i]
            });
        }
        gradients = new StakeSVG.Gradient[](1);
        gradients[0] = StakeSVG.Gradient({colors: colors, id: 0, coords: _gradColorsSpecial()});
    }

    /**
        @dev private helper to generate SVG gradients for common XENFT category
            <stop stop-color="hsl(54, 76%, 48%)" stop-opacity="1" offset="0%"/>
            <stop stop-color="hsl(21, 88%, 29%)" stop-opacity="1" offset="50%"/>
            <stop stop-color="hsl(31, 82%, 1%)" stop-opacity="1" offset="100%"/>

     */
    // TODO: look at diff gradients based on props !!!
    function _commonCategoryGradients(uint256 rarityScore, uint256 rarityBits)
        private
        pure
        returns (StakeSVG.Gradient[] memory gradients)
    {
        StakeSVG.Color[] memory colors = new StakeSVG.Color[](3);
        colors[0] = StakeSVG.Color({
            h: 54,
            s: 76,
            l: 48,
            a: DEFAULT_OPACITY,
            off: 0
        });
        colors[1] = StakeSVG.Color({
            h: 21,
            s: 88,
            l: 29,
            a: DEFAULT_OPACITY,
            off: 50
        });
        colors[2] = StakeSVG.Color({
            h: 31,
            s: 82,
            l: 1,
            a: DEFAULT_OPACITY,
            off: 100
        });
        gradients = new StakeSVG.Gradient[](1);
        gradients[0] = StakeSVG.Gradient({
            colors: colors,
            id: 0,
            coords: [uint256(50), 0, 50, 100]
        });
    }

    // PUBLIC INTERFACE

    /**
        @dev public interface to generate SVG image based on XENFT params
     */
    function svgData(
        uint256 tokenId,
        uint256 info,
        address token
    ) external view returns (bytes memory) {
        string memory symbol = IERC20Metadata(token).symbol();
        StakeSVG.SvgParams memory params = StakeSVG.SvgParams({
            symbol: symbol,
            xenAddress: token,
            tokenId: tokenId,
            term: info.getTerm(),
            maturityTs: info.getMaturityTs(),
            amount: info.getAmount(),
            apy: info.getAPY(),
            rarityScore: info.getRarityScore(),
            rarityBits: info.getRarityBits()
        });
        return StakeSVG.image(params, _commonCategoryGradients(info.getRarityScore(),info.getRarityBits()));
    }

    function _attr1(
        uint256 amount,
        uint256 apy
    ) private pure returns (bytes memory) {
        return
            abi.encodePacked(
                '{"trait_type":"Amount","value":"',
                amount.toString(),
                '"},'
                '{"trait_type":"APY","value":"',
                apy.toString(),
                '%"},'
            );
    }

    function _attr2(
        uint256 term,
        uint256 maturityTs
    ) private pure returns (bytes memory) {
        (uint256 year, string memory month) = DateTime.yearAndMonth(maturityTs);
        return
            abi.encodePacked(
                '{"trait_type":"Maturity DateTime","value":"',
                maturityTs.asString(),
                '"},'
                '{"trait_type":"Term","value":"',
                term.toString(),
                '"},'
                '{"trait_type":"Maturity Year","value":"',
                year.toString(),
                '"},'
                '{"trait_type":"Maturity Month","value":"',
                month,
                '"},'
            );
    }

    function _attr3(
        uint256 rarityScore,
        uint256 rarityBits
    ) private pure returns (bytes memory) {
        return
            abi.encodePacked(
                '{"trait_type":"Rarity","value":"',
                rarityScore.toString(),
                '"}'
            );
    }

    /**
        @dev private helper to construct attributes portion of NFT metadata
     */
    function attributes(uint256 stakeInfo) external pure returns (bytes memory) {
        (
            uint256 term,
            uint256 maturityTs,
            uint256 amount,
            uint256 apy,
            uint256 rarityScore,
            uint256 rarityBits
        ) = StakeInfo.decodeStakeInfo(stakeInfo);
        return
            abi.encodePacked(
                "[",
                _attr1(amount, apy),
                _attr2(term, maturityTs),
                _attr3(rarityScore, rarityBits),
                "]"
            );
    }

    function formattedString(uint256 n) public pure returns (string memory) {
        return FormattedStrings.toFormattedString(n);
    }
}
