module.exports = {
    hardhat: {
        solidity: {
            overrides: {
                "contracts/GoldVeinPair.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 1,
                        },
                    },
                },
                "contracts/mocks/GoldVeinPairMock.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 1,
                        },
                    },
                },
                "contracts/flat/AlpineFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/GoldVeinPairFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 350,
                        },
                    },
                },
                "contracts/flat/LuckySwapSwapperFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/PeggedOracleFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/SimpleSLPTWAP0OracleFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/SimpleSLPTWAP1OracleFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/ChainlinkOracleFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/ChainlinkOracleV2Flat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/CompoundOracle.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
                "contracts/flat/BoringHelperFlat.sol": {
                    version: "0.6.12",
                    settings: {
                        optimizer: {
                            enabled: true,
                            runs: 999999,
                        },
                    },
                },
            },
        },
    },
    solcover: {
        // We are always skipping mocks and interfaces, add specific files here
        skipFiles: [
            "libraries/FixedPoint.sol",
            "libraries/FullMath.sol",
            "libraries/SignedSafeMath.sol",
            "flat/AlpineFlat.sol",
            "flat/GoldVeinPairFlat.sol",
            "flat/LuckySwapSwapperFlat.sol",
        ],
    },
    prettier: {
        // Add or change prettier settings here
    },
}
