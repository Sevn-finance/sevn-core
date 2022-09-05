require('dotenv').config();
const SevnFactory = artifacts.require("SevnFactory");


module.exports = async function (deployer) {

  const feeToSetter = process.env.OWNER_ADDRESS;
  const feeTo = process.env.FEE_ADRESS;

  await deployer.deploy(SevnFactory, feeToSetter);
  const instance = await SevnFactory.deployed();
  
  await instance.setFeeTo(feeTo);
  const res = await instance.feeTo.call();
  const INIT_CODE_HASH = await instance.INIT_CODE_HASH.call();

  console.log('fee - ', res)
  console.log('INIT_CODE_HASH - ', INIT_CODE_HASH)
};