// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.4;

/// @title LibTreasury
library LibTreasury
{

    enum STATUS {
        RESERVEDEPOSITOR,
        RESERVESPENDER,
        RESERVETOKEN,
        RESERVEMANAGER,
        LIQUIDITYDEPOSITOR,
        LIQUIDITYTOKEN,
        LIQUIDITYMANAGER,
        REWARDMANAGER
    }

    struct Backing {
        address erc20Address;
        address tosPoolAddress;
        uint24 fee;
    }

    struct Listing {
        uint256 tokenId;
        address tosPoolAddress;
    }

    struct Minting {
        address mintAddress;
        uint256 mintPercents;
    }

}