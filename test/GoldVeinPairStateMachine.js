const { ethers } = require("hardhat")
const { expect } = require("chai")

module.exports = class GoldVeinPairStateMachine {
    constructor({ goldveinPair, alPine }) {
        this.provider = goldveinPair.provider
        this.goldveinPair = goldveinPair
        this.alPine = alPine
        this.fromBlock = 0

        // bookkeeping
        this._ignoreTransfers = false
        this._alpBalanceDeltas = []
        this._transfers = []

        this.assetToken = null
        this.collateralToken = null

        // state
        this.collateralShares = {}
        this.borrowParts = {}
        this.assetBalances = {}
        this.alpBalances = {}
        this.totalCollateralShare = ethers.BigNumber.from(0)
        this.totalAssetBase = ethers.BigNumber.from(0)
        this.totalAssetElastic = ethers.BigNumber.from(0)
        this.totalBorrowBase = ethers.BigNumber.from(0)
        this.totalBorrowElastic = ethers.BigNumber.from(0)
        this.alpTotalsBase = {}
        this.alpTotalsElastic = {}
    }

    async init() {
        const ABI = ["function balanceOf(address) external view returns(uint256)"]
        this.assetToken = new ethers.Contract(await this.goldveinPair.asset(), ABI, this.provider)
        this.collateralToken = new ethers.Contract(await this.goldveinPair.collateral(), ABI, this.provider)
    }

    _getAlpBalance(token, addr) {
        const bag = this.alpBalances[token]
        return bag && bag[addr] ? bag[addr] : ethers.BigNumber.from(0)
    }

    _setAlpBalance(token, addr, val) {
        const bag = this.alpBalances[token] || {}
        bag[addr] = val
        this.alpBalances[token] = bag
    }

    async toShare(tokenAddr, amount, roundUp) {
        const base = this.alpTotalsBase[tokenAddr]
        const elastic = this.alpTotalsElastic[tokenAddr]
        let share

        if (elastic.eq(0)) {
            share = amount
        } else {
            share = amount.mul(base).div(elastic)
            if (roundUp && share.mul(elastic).div(base).lt(amount)) {
                share = share.add(1)
            }
        }

        return share
    }

    async _verifyAlpTransfer(token, from, to, share) {
        this._alpBalanceDeltas.push({ token, from, to, share })
    }

    // alPine
    async onLogDeposit(token, from, to, amount, share) {
        this._transfers.push({ token, from, to, share })
        this._alpBalanceDeltas.push({ token, from, to, share })

        let expected = this._getAlpBalance(token, to).add(share)
        this._setAlpBalance(token, to, expected)

        const base = this.alpTotalsBase[token] || ethers.BigNumber.from(0)
        const elastic = this.alpTotalsElastic[token] || ethers.BigNumber.from(0)
        this.alpTotalsBase[token] = base.add(share)
        this.alpTotalsElastic[token] = elastic.add(amount)
    }

    // alPine
    async onLogWithdraw(token, from, to, amount, share) {
        let expected = this._getAlpBalance(token, from).sub(share)
        this._setAlpBalance(token, from, expected)

        const base = this.alpTotalsBase[token] || ethers.BigNumber.from(0)
        const elastic = this.alpTotalsElastic[token] || ethers.BigNumber.from(0)
        this.alpTotalsBase[token] = base.sub(share)
        this.alpTotalsElastic[token] = elastic.sub(amount)
    }

    // alPine
    async onLogTransfer(token, from, to, share) {
        this._transfers.push({ token, from, to, share })

        let expected = this._getAlpBalance(token, from).sub(share)
        this._setAlpBalance(token, from, expected)

        expected = this._getAlpBalance(token, to).add(share)
        this._setAlpBalance(token, to, expected)
    }

    // alPine
    async onLogFlashLoan(borrower, token, amount, feeAmount, receiver) {
        const elastic = this.alpTotalsElastic[token] || ethers.BigNumber.from(0)
        this.alpTotalsElastic[token] = elastic.add(feeAmount)
    }

    // alPine
    async onLogStrategyProfit(token, amount) {
        const elastic = this.alpTotalsElastic[token] || ethers.BigNumber.from(0)
        this.alpTotalsElastic[token] = elastic.add(amount)
    }

    // alPine
    async onLogStrategyLoss(token, amount) {
        const elastic = this.alpTotalsElastic[token] || ethers.BigNumber.from(0)
        this.alpTotalsElastic[token] = elastic.sub(amount)
    }

    async onLogAccrue(accruedAmount, feeFraction, rate, utilization) {
        this.log({ accruedAmount, feeFraction, rate, utilization })

        if (this.totalBorrowBase.eq(0)) {
            // no interest
            return
        }

        // only track change on borrows and assets
        let expected = this.totalBorrowElastic.add(accruedAmount)
        this.totalBorrowElastic = expected

        expected = this.totalAssetBase.add(feeFraction)
        this.totalAssetBase = expected
    }

    async onLogAddCollateral(from, to, share) {
        this.log({ from, to, share })

        let expected = (this.collateralShares[to] || ethers.BigNumber.from(0)).add(share)
        this.collateralShares[to] = expected

        expected = this.totalCollateralShare.add(share)
        this.totalCollateralShare = expected

        const skim = from === this.alPine.address
        if (!skim) {
            await this._verifyAlpTransfer(this.collateralToken.address, from, this.goldveinPair.address, share)
        }
    }

    async onLogAddAsset(from, to, share, fraction) {
        this.log({ from, to, share, fraction })

        if (this.totalAssetBase.add(fraction).lt(1000)) {
            return
        }

        let expected = (this.assetBalances[to] || ethers.BigNumber.from(0)).add(fraction)
        this.assetBalances[to] = expected

        expected = this.totalAssetBase.add(fraction)
        this.totalAssetBase = expected

        expected = this.totalAssetElastic.add(share)
        this.totalAssetElastic = expected

        const skim = from === this.alPine.address
        if (!skim) {
            await this._verifyAlpTransfer(this.assetToken.address, from, this.goldveinPair.address, share)
        }

        if (to === this.goldveinPair.address) {
            // probably inside a liquidation
            this._ignoreTransfers = true
        }
    }

    async onLogRemoveCollateral(from, to, share) {
        this.log({ from, to, share })

        let expected = (this.collateralShares[from] || ethers.BigNumber.from(0)).sub(share)
        this.collateralShares[from] = expected

        expected = this.totalCollateralShare.sub(share)
        this.totalCollateralShare = expected

        // check balance of collateral token in alp
        await this._verifyAlpTransfer(this.collateralToken.address, this.goldveinPair.address, to, share)
    }

    async onLogRemoveAsset(from, to, share, fraction) {
        this.log({ from, to, share, fraction })

        let expected = (this.assetBalances[from] || ethers.BigNumber.from(0)).sub(fraction)
        this.assetBalances[from] = expected

        expected = this.totalAssetBase.sub(fraction)
        this.totalAssetBase = expected

        expected = this.totalAssetElastic.sub(share)
        this.totalAssetElastic = expected

        await this._verifyAlpTransfer(this.assetToken.address, this.goldveinPair.address, to, share)
    }

    async onLogBorrow(from, to, amount, feeAmount, part) {
        this.log({ from, to, amount, feeAmount, part })

        let expected = (this.borrowParts[from] || ethers.BigNumber.from(0)).add(part)
        this.borrowParts[from] = expected

        expected = this.totalBorrowBase.add(part)
        this.totalBorrowBase = expected

        expected = this.totalBorrowElastic.add(amount.add(feeAmount))
        this.totalBorrowElastic = expected

        const BORROW_OPENING_FEE = 50
        const BORROW_OPENING_FEE_PRECISION = 1e5
        expect(feeAmount).to.be.equal(amount.mul(BORROW_OPENING_FEE).div(BORROW_OPENING_FEE_PRECISION))

        const share = await this.toShare(this.assetToken.address, amount, false)
        expected = this.totalAssetElastic.sub(share)
        this.totalAssetElastic = expected

        // transfer asset token from lendingpair
        await this._verifyAlpTransfer(this.assetToken.address, this.goldveinPair.address, to, share)
    }

    async onLogRepay(from, to, amount, part) {
        this.log({ from, to, amount, part })

        let expected = (this.borrowParts[to] || ethers.BigNumber.from(0)).sub(part)
        this.borrowParts[to] = expected

        expected = this.totalBorrowBase.sub(part)
        this.totalBorrowBase = expected

        expected = this.totalBorrowElastic.sub(amount)
        this.totalBorrowElastic = expected

        const share = await this.toShare(this.assetToken.address, amount, true)
        const skim = from === this.alPine.address

        expected = this.totalAssetElastic.add(share)
        this.totalAssetElastic = expected

        if (!skim) {
            await this._verifyAlpTransfer(this.assetToken.address, from, this.goldveinPair.address, share)
        }
    }

    async onLogWithdrawFees(receiver, feesEarned) {
        this.log({ receiver, feesEarned })
        let expected = (this.assetBalances[receiver] || ethers.BigNumber.from(0)).add(feesEarned)
        this.assetBalances[receiver] = expected
    }

    log(...args) {
        if (process.env.DEBUG) {
            console.log(this.constructor.name, ...args)
        }
    }

    async verify() {
        if (!this._ignoreTransfers) {
            // if we are inside a closed liquidation, then it is not possible to predict the asset flow
            expect(this._alpBalanceDeltas.length, "should be equal to transfers").to.be.equal(this._transfers.length)

            while (this._transfers.length) {
                const a = this._transfers.pop()
                const b = this._alpBalanceDeltas.pop()

                expect(a).to.be.deep.equal(b)
            }
        }
        this._ignoreTransfers = false
        this._alpBalanceDeltas = []
        this._transfers = []

        expect(this.totalCollateralShare, "total collateral").to.be.equal(await this.goldveinPair.totalCollateralShare())
        expect(this.totalAssetBase, "asset base").to.be.equal((await this.goldveinPair.totalAsset()).base)
        expect(this.totalAssetElastic, "asset elastic").to.be.equal((await this.goldveinPair.totalAsset()).elastic)
        expect(this.totalBorrowBase, "total borrow base").to.be.equal((await this.goldveinPair.totalBorrow()).base)
        expect(this.totalBorrowElastic, "total borrow elastic").to.be.equal((await this.goldveinPair.totalBorrow()).elastic)

        for (const addr in this.collateralShares) {
            expect(this.collateralShares[addr]).to.be.equal(await this.goldveinPair.userCollateralShare(addr))
        }

        for (const addr in this.borrowParts) {
            expect(this.borrowParts[addr]).to.be.equal(await this.goldveinPair.userBorrowPart(addr))
        }

        for (const addr in this.assetBalances) {
            expect(this.assetBalances[addr]).to.be.equal(await this.goldveinPair.balanceOf(addr))
        }

        for (const tokenAddr in this.alpBalances) {
            for (const user in this.alpBalances[tokenAddr]) {
                expect(this._getAlpBalance(tokenAddr, user), "alp balance").to.be.equal(await this.alPine.balanceOf(tokenAddr, user))
            }
        }

        for (const tokenAddr in this.alpTotalsBase) {
            const base = this.alpTotalsBase[tokenAddr]
            const elastic = this.alpTotalsElastic[tokenAddr]
            const other = await this.alPine.totals(tokenAddr)

            expect(base).to.be.equal(other.base)
            expect(elastic).to.be.equal(other.elastic)
        }

        // xxx this can also be more (can be skimmed)
        expect(this.totalAssetElastic).to.be.at.most(await this.alPine.balanceOf(this.assetToken.address, this.goldveinPair.address))

        this.log({ totalCollateralShare: this.totalCollateralShare.toString() })
        this.log({ borrowBase: this.totalBorrowBase.toString(), borrowRepay: this.totalBorrowElastic.toString() })
        this.log({ assetBase: this.totalAssetBase.toString(), assetHeld: this.totalAssetElastic.toString() })

        expect(this.totalBorrowElastic, "totalBorrow.elastic must be >= totalBorrow.base").to.be.at.least(this.totalBorrowBase)
    }

    async drainEvents() {
        const contracts = {
            [this.alPine.address.toLowerCase()]: this.alPine,
            [this.goldveinPair.address.toLowerCase()]: this.goldveinPair,
        }
        const blockNum = await this.provider.getBlockNumber()
        if (this.fromBlock == 0 && blockNum > 100) {
            this.fromBlock = blockNum - 100
        }

        if (blockNum < this.fromBlock) {
            return
        }

        const payload = {
            fromBlock: "0x" + this.fromBlock.toString(16),
            toBlock: "0x" + blockNum.toString(16),
        }
        this.fromBlock = blockNum + 1

        const logs = await this.provider.send("eth_getLogs", [payload])
        for (const log of logs) {
            const contract = contracts[log.address.toLowerCase()]
            if (!contract || !contract.interface) {
                continue
            }
            const event = contract.interface.parseLog(log)
            const handler = `on${event.name}`

            if (typeof this[handler] !== "function") {
                this.log(`${event.name} not handled`)
                continue
            }
            this.log(Number(log.blockNumber), event.name)

            const tx = await this.provider.getTransaction(log.transactionHash)

            if (tx.to !== this.goldveinPair.address) {
                this.log("warning: transfers are not checked due to other contract interactions")
                this._ignoreTransfers = true
            }
            await this[handler](...event.args, tx)
        }

        await this.verify()
    }
}
