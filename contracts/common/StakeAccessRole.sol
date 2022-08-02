// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract StakeAccessRole {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

    bytes32 public constant PROJECT_ADMIN_ROLE = keccak256("PROJECT_ADMIN_ROLE");

    bytes32 public constant POLICY_ROLE = keccak256("POLICY_ROLE");

}
