// SPDX-License-Identifier: MIT

pragma solidity =0.5.16;

interface ISevnCallee {
    function sevnCall(address sender, uint amount0, uint amount1, bytes calldata data) external;
}
