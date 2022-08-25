// SPDX-License-Identifier: MIT

pragma solidity =0.5.16;

import './interfaces/ISevnFactory.sol';
import './SevnPair.sol';

contract SevnFactory is ISevnFactory {
    
    address public feeTo;
    address public feeToSetter;

    uint256 public swapFee = 2; // uses 0.2% default
    uint256 public devFee = 3; // uses 0.03% default from swapFee

    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    constructor(address _feeToSetter) public {
        feeToSetter = _feeToSetter;
    }

    function allPairsLength() external view returns (uint) {
        return allPairs.length;
    }

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, 'Sevn: IDENTICAL_ADDRESSES');
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'Sevn: ZERO_ADDRESS');
        require(getPair[token0][token1] == address(0), 'Sevn: PAIR_EXISTS'); // single check is sufficient
        bytes memory bytecode = type(SevnPair).creationCode;
        bytes32 salt = keccak256(abi.encodePacked(token0, token1));
        assembly {
            pair := create2(0, add(bytecode, 32), mload(bytecode), salt)
        }
        ISevnPair(pair).initialize(token0, token1);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair; // populate mapping in the reverse direction
        allPairs.push(pair);
        emit PairCreated(token0, token1, pair, allPairs.length);
    }

    function setFeeTo(address _feeTo) external {
        require(msg.sender == feeToSetter, 'Sevn: FORBIDDEN');
        feeTo = _feeTo;
    }

    function setFeeToSetter(address _feeToSetter) external {
        require(msg.sender == feeToSetter, 'Sevn: FORBIDDEN');
        feeToSetter = _feeToSetter;
    }

    function setSwapFee(uint256 _swapFee) external {
        require(msg.sender == feeToSetter, 'Sevn: FORBIDDEN');
        require(_swapFee >= 0 && _swapFee <= 5, 'Sevn: < 0% or > 0.5%');
        swapFee = _swapFee;
    }

    function setDevFee(uint256 _devFee) external {
        require(msg.sender == feeToSetter, 'Sevn: FORBIDDEN');
        require(_devFee >= 0 && _devFee <= 20, 'Sevn: < 0% or > 0.2%');
        devFee = _devFee;
    }

    function switchIndividualFee(address _pair, bool _enable) external {
        require(msg.sender == feeToSetter, 'Sevn: FORBIDDEN');
        SevnPair(_pair).switchIndividualFee(_enable);
    }

    function setIndividualSwapFee(address _pair, uint256 _swapFee) external {
        require(msg.sender == feeToSetter, 'Sevn: FORBIDDEN');
        require(_swapFee >= 0 && _swapFee <= 5, 'Sevn: PAIR < 0% or > 0.5%');
        SevnPair(_pair).setIndividualSwapFee(_swapFee);
    }

    function setIndividualDevFee(address _pair, uint256 _devFee) external {
        require(msg.sender == feeToSetter, 'Sevn: FORBIDDEN');
        require(_devFee >= 0 && _devFee <= 20, 'Sevn: PAIR < 0% or > 0.2%');
        SevnPair(_pair).setIndividualDevFee(_devFee);(_devFee);

    }
}
