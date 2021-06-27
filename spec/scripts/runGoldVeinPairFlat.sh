certoraRun spec/harness/GoldVeinPairHarnessFlat.sol spec/harness/DummyERC20A.sol \
	spec/harness/DummyERC20B.sol spec/harness/Swapper.sol spec/harness/SimpleAlpine.sol contracts/mocks/OracleMock.sol spec/harness/DummyWeth.sol spec/harness/WhitelistedSwapper.sol \
	--link GoldVeinPairHarnessFlat:collateral=DummyERC20A GoldVeinPairHarnessFlat:asset=DummyERC20B GoldVeinPairHarnessFlat:alPine=SimpleAlpine GoldVeinPairHarnessFlat:oracle=OracleMock  GoldVeinPairHarnessFlat:masterContract=GoldVeinPairHarnessFlat GoldVeinPairHarnessFlat:whitelistedSwapper=WhitelistedSwapper GoldVeinPairHarnessFlat:redSwapper=Swapper \
	--settings -copyLoopUnroll=4,-b=1,-ignoreViewFunctions,-enableStorageAnalysis=true,-assumeUnwindCond,-recursionEntryLimit=10 \
	--verify GoldVeinPairHarnessFlat:spec/goldveinPair.spec \
	--solc_args "['--optimize', '--optimize-runs', '800']" \
	--msg "GoldVeinPairHarnessFlat all rules optimize-runs 800"  
