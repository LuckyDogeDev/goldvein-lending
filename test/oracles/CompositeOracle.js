const { ethers } = require("hardhat")
const { expect } = require("chai")
const { getBigNumber, roundBN, advanceTime, createFixture } = require("@luckyfinance/hardhat-framework")

describe("CompositeOracle", function () {
    before(async function () {
        this.goldnuggetAmount = getBigNumber(400)
        this.ethAmount = getBigNumber(1)
        this.daiAmount = getBigNumber(500)

        fixture = await createFixture(deployments, this, async (cmd) => {
            await cmd.deploy("weth9", "WETH9Mock")
            await cmd.deploy("goldnugget", "ReturnFalseERC20Mock", "GOLN", "GOLN", 18, getBigNumber("10000000"))
            await cmd.deploy("ethToken", "ReturnFalseERC20Mock", "WETH", "ETH", 18, getBigNumber("10000000"))
            await cmd.deploy("daiToken", "ReturnFalseERC20Mock", "DAI", "DAI", 18, getBigNumber("10000000"))
            await cmd.deploy("factory", "UniswapV2Factory", this.alice.address)
            await cmd.deploy("alPine", "AlpineMock", this.weth9.address)

            let createPairTx = await this.factory.createPair(this.goldnugget.address, this.ethToken.address)

            const pairGoldNuggetEth = (await createPairTx.wait()).events[0].args.pair

            await cmd.getContract("UniswapV2Pair")
            this.pairGoldNuggetEth = await this.UniswapV2Pair.attach(pairGoldNuggetEth)

            await this.goldnugget.transfer(this.pairGoldNuggetEth.address, this.goldnuggetAmount)
            await this.ethToken.transfer(this.pairGoldNuggetEth.address, this.ethAmount)

            await this.pairGoldNuggetEth.mint(this.alice.address)

            if (this.ethToken.address == (await this.pairGoldNuggetEth.token0())) {
                await cmd.deploy("oracleGoldNuggetEth", "SimpleSLPTWAP0Oracle")
            } else {
                await cmd.deploy("oracleGoldNuggetEth", "SimpleSLPTWAP1Oracle")
            }
            this.oracleDataA = await this.oracleGoldNuggetEth.getDataParameter(this.pairGoldNuggetEth.address)

            createPairTx = await this.factory.createPair(this.ethToken.address, this.daiToken.address)

            const pairDaiEth = (await createPairTx.wait()).events[0].args.pair

            this.pairDaiEth = await this.UniswapV2Pair.attach(pairDaiEth)

            await this.daiToken.transfer(this.pairDaiEth.address, this.daiAmount)
            await this.ethToken.transfer(this.pairDaiEth.address, this.ethAmount)

            await this.pairDaiEth.mint(this.alice.address)

            if (this.daiToken.address == (await this.pairDaiEth.token0())) {
                await cmd.deploy("oracleDaiEth", "SimpleSLPTWAP0Oracle")
            } else {
                await cmd.deploy("oracleDaiEth", "SimpleSLPTWAP1Oracle")
            }
            this.oracleDataB = await this.oracleDaiEth.getDataParameter(this.pairDaiEth.address)
            await cmd.deploy("compositeOracle", "CompositeOracle")

            this.compositeOracleData = await this.compositeOracle.getDataParameter(
                this.oracleGoldNuggetEth.address,
                this.oracleDaiEth.address,
                this.oracleDataA,
                this.oracleDataB
            )
        })
    })

    beforeEach(async function () {
        cmd = await fixture()
    })

    describe("peek", function () {
        it("should return false on first peek", async function () {
            expect((await this.compositeOracle.peek(this.compositeOracleData))[1]).to.equal("0")
        })
    })

    describe("get", function () {
        it("should update and get prices within period", async function () {
            await this.compositeOracle.get(this.compositeOracleData)
            await advanceTime(301, ethers)
            await this.compositeOracle.get(this.compositeOracleData)

            const price = (await this.compositeOracle.peek(this.compositeOracleData))[1]
            expect(roundBN(price)).to.be.equal("80")
        })
        it("should update prices after swap", async function () {
            //update exchange rate
            await this.compositeOracle.get(this.compositeOracleData)
            await advanceTime(301, ethers)
            await this.compositeOracle.get(this.compositeOracleData)

            //check the composite oracle
            let price0 = (await this.compositeOracle.peek(this.compositeOracleData))[1]

            //check expectations
            const oldPrice = this.goldnuggetAmount.mul(100).div(this.daiAmount)
            expect(roundBN(price0)).to.be.equal(oldPrice)

            //half the goldnugget price
            await advanceTime(150, ethers)
            await this.goldnugget.transfer(this.pairGoldNuggetEth.address, getBigNumber(400))
            await this.pairGoldNuggetEth.sync()
            await advanceTime(150, ethers)

            // read exchange rate again half way
            await this.compositeOracle.get(this.compositeOracleData)
            let price1 = (await this.compositeOracle.peek(this.compositeOracleData))[1]

            //check expectations
            // oracle returns "the amount of callateral unit to buy 10^18 of asset units"
            // expectation: 1.2 of GoldNugget to buy 1 DAI
            expect(roundBN(price1)).to.be.equal("120")

            //read exchange rate at final price
            await advanceTime(301, ethers)
            await this.compositeOracle.get(this.compositeOracleData)
            let price2 = (await this.compositeOracle.peek(this.compositeOracleData))[1]
            // oracle returns "the amount of callateral unit to buy 10^18 of asset units"
            // expectation: 1.6 of GoldNugget to buy 1 DAI

            expect(roundBN(price2)).to.be.equal("160")
        })
    })

    it("Assigns name LuckySwap TWAP+LuckySwap TWAP to Composite Oracle", async function () {
        expect(await this.compositeOracle.name(this.compositeOracleData)).to.equal("LuckySwap TWAP+LuckySwap TWAP")
    })

    it("Assigns symbol S+S to Composite Oracle", async function () {
        expect(await this.compositeOracle.symbol(this.compositeOracleData)).to.equal("S+S")
    })
})
