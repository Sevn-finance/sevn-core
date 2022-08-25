import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { AddressZero } from 'ethers/constants'
import { bigNumberify } from 'ethers/utils'
import { solidity, MockProvider, createFixtureLoader } from 'ethereum-waffle'

import { getCreate2Address } from './shared/utilities'
import { factoryFixture } from './shared/fixtures'
import { pairFixture } from './shared/fixtures'

import SevnPair from '../build/SevnPair.json'

chai.use(solidity)

const TEST_ADDRESSES: [string, string] = [
  '0x1000000000000000000000000000000000000000',
  '0x2000000000000000000000000000000000000000'
]

describe('SevnFactory', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet, other] = provider.getWallets()
  const loadFixture = createFixtureLoader(provider, [wallet, other])

  let factory: Contract
  beforeEach(async () => {
    const fixture = await loadFixture(factoryFixture)
    factory = fixture.factory
  })

  it('feeTo, feeToSetter, allPairsLength', async () => {
    expect(await factory.feeTo()).to.eq(AddressZero)
    expect(await factory.feeToSetter()).to.eq(wallet.address)
    expect(await factory.allPairsLength()).to.eq(0)
  })

  async function createPair(tokens: [string, string]) {
    const bytecode = `0x${SevnPair.evm.bytecode.object}`
    const create2Address = getCreate2Address(factory.address, tokens, bytecode)
    await expect(factory.createPair(...tokens))
      .to.emit(factory, 'PairCreated')
      .withArgs(TEST_ADDRESSES[0], TEST_ADDRESSES[1], create2Address, bigNumberify(1))

    await expect(factory.createPair(...tokens)).to.be.reverted // UniswapV2: PAIR_EXISTS
    await expect(factory.createPair(...tokens.slice().reverse())).to.be.reverted // UniswapV2: PAIR_EXISTS
    expect(await factory.getPair(...tokens)).to.eq(create2Address)
    expect(await factory.getPair(...tokens.slice().reverse())).to.eq(create2Address)
    expect(await factory.allPairs(0)).to.eq(create2Address)
    expect(await factory.allPairsLength()).to.eq(1)

    const pair = new Contract(create2Address, JSON.stringify(SevnPair.abi), provider)
    expect(await pair.factory()).to.eq(factory.address)
    expect(await pair.token0()).to.eq(TEST_ADDRESSES[0])
    expect(await pair.token1()).to.eq(TEST_ADDRESSES[1])
  }

  it('createPair', async () => {
    await createPair(TEST_ADDRESSES)
  })

  it('createPair:reverse', async () => {
    await createPair(TEST_ADDRESSES.slice().reverse() as [string, string])
  })

  it('createPair:gas', async () => {
    const tx = await factory.createPair(...TEST_ADDRESSES)
    const receipt = await tx.wait()
    expect(receipt.gasUsed).to.eq(2743823)
  })

  it('setFeeTo', async () => {
    await expect(factory.connect(other).setFeeTo(other.address)).to.be.revertedWith('Sevn: FORBIDDEN')
    await factory.setFeeTo(wallet.address)
    expect(await factory.feeTo()).to.eq(wallet.address)
  })

  it('setFeeToSetter', async () => {
    await expect(factory.connect(other).setFeeToSetter(other.address)).to.be.revertedWith('Sevn: FORBIDDEN')
    await factory.setFeeToSetter(other.address)
    expect(await factory.feeToSetter()).to.eq(other.address)
    await expect(factory.setFeeToSetter(wallet.address)).to.be.revertedWith('Sevn: FORBIDDEN')
  })

  it('setSwapFee', async () => {
    await expect(factory.connect(other).setSwapFee(bigNumberify('5'))).to.be.revertedWith('Sevn: FORBIDDEN');
    await expect(factory.setSwapFee(bigNumberify('6'))).to.be.revertedWith('Sevn: < 0% or > 0.5%');
    await factory.setSwapFee(bigNumberify('4'))
    expect(await factory.swapFee()).to.eq(bigNumberify('4'))
  })

  it('setDevFee', async () => {
    await expect(factory.connect(other).setDevFee(bigNumberify('5'))).to.be.revertedWith('Sevn: FORBIDDEN');
    await expect(factory.setDevFee(bigNumberify('21'))).to.be.revertedWith('Sevn: < 0% or > 0.2%');
    await factory.setDevFee(bigNumberify('6'))
    expect(await factory.devFee()).to.eq(bigNumberify('6'))
  })

  it('individualFee', async() => {

    const fixture = await loadFixture(pairFixture)
    const factory = fixture.factory
    const pair = fixture.pair

    await expect(factory.connect(other).switchIndividualFee(pair.address, true)).to.be.revertedWith('Sevn: FORBIDDEN')
    await factory.switchIndividualFee(pair.address, true);
    expect(await pair.isIndividualFee()).to.eq(true)
    
    await expect(factory.connect(other).setIndividualSwapFee(pair.address, bigNumberify('2'))).to.be.revertedWith('Sevn: FORBIDDEN')
    await expect(factory.setIndividualSwapFee(pair.address, bigNumberify('21'))).to.be.revertedWith('Sevn: PAIR < 0% or > 0.5%');
    await factory.setIndividualSwapFee(pair.address, bigNumberify('5'));
    expect(await pair.getSwapFee()).to.eq(bigNumberify('5'))


    await expect(factory.connect(other).setIndividualDevFee(pair.address, bigNumberify('2'))).to.be.revertedWith('Sevn: FORBIDDEN')
    await expect(factory.setIndividualDevFee(pair.address, bigNumberify('21'))).to.be.revertedWith('Sevn: PAIR < 0% or > 0.2%');
    await factory.setIndividualDevFee(pair.address, bigNumberify('20'));
    expect(await pair.getDevFee()).to.eq(bigNumberify('20'))

    await factory.switchIndividualFee(pair.address, false);
    expect(await pair.getSwapFee()).to.eq(bigNumberify('2'))
    expect(await pair.getDevFee()).to.eq(bigNumberify('3'))

  })
})
