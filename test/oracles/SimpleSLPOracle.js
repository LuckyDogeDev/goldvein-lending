const { ethers } = require("hardhat")
const { expect } = require("chai")
const { getBigNumber, roundBN, encodePrice, advanceTime, advanceTimeAndBlock, createFixture } = require("@sushiswap/hardhat-framework")

describe("SimpleSLPOracle", function () {
    before(async function () {
        fixture = await createFixture(deployments, this, async (cmd) => {
            await cmd.addToken("collateral", "Collateral", "C", 18, this.ReturnFalseERC20Mock)
            await cmd.addToken("asset", "Asset", "A", 18, this.RevertingERC20Mock)
            await cmd.addPair("luckySwapPair", this.collateral, this.asset, 5, 10)

            this.expectedPrice = encodePrice(getBigNumber(5), getBigNumber(10))

            if (this.asset.address == (await this.luckySwapPair.token0())) {
                await cmd.deploy("oracleF", "SimpleSLPTWAP0Oracle")
                await cmd.deploy("oracleB", "SimpleSLPTWAP1Oracle")
            } else {
                await cmd.deploy("oracleF", "SimpleSLPTWAP1Oracle")
                await cmd.deploy("oracleB", "SimpleSLPTWAP0Oracle")
            }
            this.oracleData = await this.oracleF.getDataParameter(this.luckySwapPair.address)
        })
    })

    beforeEach(async function () {
        cmd = await fixture()
    })

    describe("forward oracle", function () {
        describe("name", function () {
            it("should get name", async function () {
                expect(await this.oracleF.name(this.oracleData)).to.be.equal("LuckySwap TWAP")
                expect(await this.oracleB.name(this.oracleData)).to.be.equal("LuckySwap TWAP")
            })
        })

        describe("symbol", function () {
            it("should get symbol", async function () {
                expect(await this.oracleF.symbol(this.oracleData)).to.be.equal("S")
                expect(await this.oracleB.symbol(this.oracleData)).to.be.equal("S")
            })
        })

        describe("peek", function () {
            it("should return false on first peek", async function () {
                expect((await this.oracleF.peek(this.oracleData))[1]).to.equal("0")
                expect((await this.oracleB.peek(this.oracleData))[1]).to.equal("0")
            })

            it("should get price even when time since last update is longer than period", async function () {
                const blockTimestamp = (await this.luckySwapPair.getReserves())[2]

                await this.oracleF.get(this.oracleData)
                await this.oracleB.get(this.oracleData)
                await advanceTime(30, ethers)
                await this.oracleF.get(this.oracleData)
                await this.oracleB.get(this.oracleData)
                await advanceTime(271, ethers)
                await this.oracleF.get(this.oracleData)
                await this.oracleB.get(this.oracleData)

                let info = (await this.oracleF.pairs(this.luckySwapPair.address)).priceAverage.toString()
                expect(info).to.be.equal(this.expectedPrice[1].toString())

                await advanceTimeAndBlock(301, ethers)

                expect((await this.oracleF.peek(this.oracleData))[1]).to.be.equal(getBigNumber(1).mul(5).div(10))
                expect(await this.oracleF.peekSpot(this.oracleData)).to.be.equal(getBigNumber(1).mul(5).div(10))
                await this.oracleB.peek(this.oracleData)
            })
        })

        describe("get", function () {
            it("should update and get prices within period", async function () {
                const blockTimestamp = (await this.luckySwapPair.getReserves())[2]

                await this.oracleF.get(this.oracleData)
                await this.oracleB.get(this.oracleData)
                await advanceTime(30, ethers)
                await this.oracleF.get(this.oracleData)
                await this.oracleB.get(this.oracleData)
                await advanceTime(271, ethers)
                await this.oracleB.get(this.oracleData)
                await this.oracleB.get(this.oracleData)
                await this.oracleF.get(this.oracleData)
                await this.oracleF.get(this.oracleData)

                let info = (await this.oracleF.pairs(this.luckySwapPair.address)).priceAverage.toString()

                expect(info).to.be.equal(this.expectedPrice[1].toString())
                expect((await this.oracleF.peek(this.oracleData))[1]).to.be.equal(getBigNumber(1).mul(5).div(10))
                await this.oracleB.peek(this.oracleData)
            })

            it("should update prices after swap", async function () {
                const blockTimestamp = (await this.luckySwapPair.getReserves())[2]
                await this.oracleF.get(this.oracleData)
                await advanceTime(301, ethers)
                await this.oracleF.get(this.oracleData)

                const price0 = (await this.oracleF.peek(this.oracleData))[1]
                await this.collateral.transfer(this.luckySwapPair.address, getBigNumber(5))
                await advanceTime(150, ethers)
                await this.luckySwapPair.sync()
                await advanceTime(150, ethers)
                await this.oracleF.get(this.oracleData)
                const price1 = (await this.oracleF.peek(this.oracleData))[1]
                const price1spot = await this.oracleF.peekSpot(this.oracleData)

                expect(price0).to.be.equal(getBigNumber(1).mul(5).div(10))
                expect(roundBN(price1)).to.be.equal(roundBN(getBigNumber(1).mul(75).div(100)))
                expect(roundBN(price1spot)).to.be.equal(roundBN(getBigNumber(1)))
            })
        })

        it("Assigns name to LuckySwap TWAP", async function () {
            expect(await this.oracleF.name(this.oracleData)).to.equal("LuckySwap TWAP")
        })

        it("Assigns symbol to S", async function () {
            expect(await this.oracleF.symbol(this.oracleData)).to.equal("S")
        })
    })

    describe("backwards oracle", function () {})
})
