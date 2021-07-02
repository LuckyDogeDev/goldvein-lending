const { expect } = require("chai")
const { prepare, getBigNumber, createFixture } = require("@luckyfinance/hardhat-framework")

let cmd, fixture

describe("LuckySwapSwapper", function () {
    before(async function () {
        fixture = await createFixture(deployments, this, async (cmd) => {
            await cmd.addToken("a", "Token A", "A", 18, this.ReturnFalseERC20Mock)
            await cmd.addToken("b", "Token B", "B", 8, this.RevertingERC20Mock)
            await cmd.addPair("luckySwapPair", this.a, this.b, 50000, 50000)

            await cmd.deploy("weth9", "WETH9Mock")
            await cmd.deploy("alPine", "AlpineMock", this.weth9.address)
            await cmd.deploy("swapper", "LuckySwapSwapper", this.alPine.address, this.factory.address, await this.factory.pairCodeHash())
        })
    })

    beforeEach(async function () {
        cmd = await fixture()
    })

    describe("Swap", function () {
        it("should swap", async function () {
            await this.a.approve(this.alPine.address, getBigNumber(100))
            await this.alPine.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.alPine.transfer(this.a.address, this.alice.address, this.swapper.address, getBigNumber(20))
            await expect(this.swapper.swap(this.a.address, this.b.address, this.alice.address, 0, getBigNumber(20)))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "20000000000000000000")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.a.address, this.swapper.address, this.luckySwapPair.address, "20000000000000000000", "20000000000000000000")
                .to.emit(this.b, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "1993205109")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.b.address, this.alPine.address, this.alice.address, "1993205109", "1993205109")
        })

        it("should swap with minimum set", async function () {
            await this.a.approve(this.alPine.address, getBigNumber(100))
            await this.alPine.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.alPine.transfer(this.a.address, this.alice.address, this.swapper.address, getBigNumber(20))
            await expect(this.swapper.swap(this.a.address, this.b.address, this.alice.address, "1993205109", getBigNumber(20)))
                .to.emit(this.a, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "20000000000000000000")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.a.address, this.swapper.address, this.luckySwapPair.address, "20000000000000000000", "20000000000000000000")
                .to.emit(this.b, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "1993205109")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.b.address, this.alPine.address, this.alice.address, "1993205109", "1993205109")
        })

        it("should not swap with minimum not met", async function () {
            await this.a.approve(this.alPine.address, getBigNumber(100))
            await this.alPine.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.alPine.transfer(this.a.address, this.alice.address, this.swapper.address, getBigNumber(20))
            await expect(
                this.swapper.swap(this.a.address, this.b.address, this.alice.address, "1993205110", getBigNumber(20))
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("should swap in opposite direction", async function () {
            await this.b.approve(this.alPine.address, getBigNumber(100, 8))
            await this.alPine.deposit(this.b.address, this.alice.address, this.alice.address, getBigNumber(100, 8), 0)
            await this.alPine.transfer(this.b.address, this.alice.address, this.swapper.address, getBigNumber(20, 8))
            await expect(this.swapper.swap(this.b.address, this.a.address, this.alice.address, 0, getBigNumber(20, 8)))
                .to.emit(this.b, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "2000000000")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.b.address, this.swapper.address, this.luckySwapPair.address, "2000000000", "2000000000")
                .to.emit(this.a, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "19932051098022108783")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.a.address, this.alPine.address, this.alice.address, "19932051098022108783", "19932051098022108783")
        })

        it("should swap in opposite direction with minimum set", async function () {
            await this.b.approve(this.alPine.address, getBigNumber(100, 8))
            await this.alPine.deposit(this.b.address, this.alice.address, this.alice.address, getBigNumber(100, 8), 0)
            await this.alPine.transfer(this.b.address, this.alice.address, this.swapper.address, getBigNumber(20, 8))
            await expect(this.swapper.swap(this.b.address, this.a.address, this.alice.address, "19932051098022108783", getBigNumber(20, 8)))
                .to.emit(this.b, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "2000000000")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.b.address, this.swapper.address, this.luckySwapPair.address, "2000000000", "2000000000")
                .to.emit(this.a, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "19932051098022108783")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.a.address, this.alPine.address, this.alice.address, "19932051098022108783", "19932051098022108783")
        })

        it("should not swap in opposite direction with minimum not met", async function () {
            await this.b.approve(this.alPine.address, getBigNumber(100, 8))
            await this.alPine.deposit(this.b.address, this.alice.address, this.alice.address, getBigNumber(100, 8), 0)
            await this.alPine.transfer(this.b.address, this.alice.address, this.swapper.address, getBigNumber(20, 8))
            await expect(
                this.swapper.swap(this.b.address, this.a.address, this.alice.address, "19932051098022108784", getBigNumber(20, 8))
            ).to.be.revertedWith("BoringMath: Underflow")
        })
    })

    describe("Swap Exact", function () {
        it("should swap exact", async function () {
            await this.a.approve(this.alPine.address, getBigNumber(100))
            await this.alPine.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.alPine.transfer(this.a.address, this.alice.address, this.swapper.address, getBigNumber(30))
            await expect(
                this.swapper.swapExact(
                    this.a.address,
                    this.b.address,
                    this.alice.address,
                    this.bob.address,
                    getBigNumber(30),
                    getBigNumber(20, 8)
                )
            )
                .to.emit(this.a, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "20068207824754776535")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.a.address, this.swapper.address, this.luckySwapPair.address, "20068207824754776535", "20068207824754776535")
                .to.emit(this.b, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "2000000000")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.b.address, this.alPine.address, this.alice.address, "2000000000", "2000000000")
                .to.emit(this.alPine, "LogTransfer")
                .withArgs(this.a.address, this.swapper.address, this.bob.address, "9931792175245223465")
        })

        it("should swap exact with exact amountIn", async function () {
            await this.a.approve(this.alPine.address, getBigNumber(100))
            await this.alPine.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.alPine.transfer(this.a.address, this.alice.address, this.swapper.address, "20068207824754776535")
            await expect(
                this.swapper.swapExact(
                    this.a.address,
                    this.b.address,
                    this.alice.address,
                    this.bob.address,
                    "20068207824754776535",
                    getBigNumber(20, 8)
                )
            )
                .to.emit(this.a, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "20068207824754776535")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.a.address, this.swapper.address, this.luckySwapPair.address, "20068207824754776535", "20068207824754776535")
                .to.emit(this.b, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "2000000000")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.b.address, this.alPine.address, this.alice.address, "2000000000", "2000000000")
        })

        it("should not swap exact with not enough amountIn", async function () {
            await this.a.approve(this.alPine.address, getBigNumber(100))
            await this.alPine.deposit(this.a.address, this.alice.address, this.alice.address, getBigNumber(100), 0)
            await this.alPine.transfer(this.a.address, this.alice.address, this.swapper.address, "20068207824754776534")
            await expect(
                this.swapper.swapExact(
                    this.a.address,
                    this.b.address,
                    this.alice.address,
                    this.bob.address,
                    "20068207824754776534",
                    getBigNumber(20, 8)
                )
            ).to.be.revertedWith("BoringMath: Underflow")
        })

        it("should swap exact in opposite direction", async function () {
            await this.b.approve(this.alPine.address, getBigNumber(100, 8))
            await this.alPine.deposit(this.b.address, this.alice.address, this.alice.address, getBigNumber(100, 8), 0)
            await this.alPine.transfer(this.b.address, this.alice.address, this.swapper.address, getBigNumber(30, 8))
            await expect(
                this.swapper.swapExact(
                    this.b.address,
                    this.a.address,
                    this.alice.address,
                    this.bob.address,
                    getBigNumber(30, 8),
                    getBigNumber(20)
                )
            )
                .to.emit(this.b, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "2006820783")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.b.address, this.swapper.address, this.luckySwapPair.address, "2006820783", "2006820783")
                .to.emit(this.a, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "20000000000000000000")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.a.address, this.alPine.address, this.alice.address, "20000000000000000000", "20000000000000000000")
                .to.emit(this.alPine, "LogTransfer")
                .withArgs(this.b.address, this.swapper.address, this.bob.address, "993179217")
        })

        it("should swap exact in opposite direction with exact AmountIn", async function () {
            await this.b.approve(this.alPine.address, getBigNumber(100, 8))
            await this.alPine.deposit(this.b.address, this.alice.address, this.alice.address, getBigNumber(100, 8), 0)
            await this.alPine.transfer(this.b.address, this.alice.address, this.swapper.address, "2006820783")
            await expect(
                this.swapper.swapExact(this.b.address, this.a.address, this.alice.address, this.bob.address, "2006820783", getBigNumber(20))
            )
                .to.emit(this.b, "Transfer")
                .withArgs(this.alPine.address, this.luckySwapPair.address, "2006820783")
                .to.emit(this.alPine, "LogWithdraw")
                .withArgs(this.b.address, this.swapper.address, this.luckySwapPair.address, "2006820783", "2006820783")
                .to.emit(this.a, "Transfer")
                .withArgs(this.luckySwapPair.address, this.alPine.address, "20000000000000000000")
                .to.emit(this.alPine, "LogDeposit")
                .withArgs(this.a.address, this.alPine.address, this.alice.address, "20000000000000000000", "20000000000000000000")
        })

        it("should not swap exact in opposite direction with not enough amountIn", async function () {
            await this.b.approve(this.alPine.address, getBigNumber(100, 8))
            await this.alPine.deposit(this.b.address, this.alice.address, this.alice.address, getBigNumber(100, 8), 0)
            await this.alPine.transfer(this.b.address, this.alice.address, this.swapper.address, "2006820782")
            await expect(
                this.swapper.swapExact(this.b.address, this.a.address, this.alice.address, this.bob.address, "2006820782", getBigNumber(20))
            ).to.be.revertedWith("BoringMath: Underflow")
        })
    })
})
