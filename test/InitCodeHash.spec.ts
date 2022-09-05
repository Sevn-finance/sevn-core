import { keccak256 } from '@ethersproject/solidity'
import { bytecode  } from '../build/SevnPair.json'

const COMPUTED_INIT_CODE_HASH = keccak256(['bytes'], [`0x${bytecode}`])
console.log(COMPUTED_INIT_CODE_HASH);