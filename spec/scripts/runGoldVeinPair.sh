certoraRun spec/harness/GoldVeinPairHarness.sol spec/harness/DummyERC20A.sol \
	spec/harness/DummyERC20B.sol spec/harness/Swapper.sol spec/harness/SimpleAlpine.sol contracts/mocks/OracleMock.sol spec/harness/DummyWeth.sol spec/harness/WhitelistedSwapper.sol \
	--link GoldVeinPairHarness:collateral=DummyERC20A GoldVeinPairHarness:asset=DummyERC20B GoldVeinPairHarness:alPine=SimpleAlpine GoldVeinPairHarness:oracle=OracleMock  GoldVeinPairHarness:masterContract=GoldVeinPairHarness GoldVeinPairHarness:whitelistedSwapper=WhitelistedSwapper GoldVeinPairHarness:redSwapper=Swapper \
	--settings -copyLoopUnroll=4,-b=1,-ignoreViewFunctions,-enableStorageAnalysis=true,-assumeUnwindCond,-ciMode=true \
	--verify GoldVeinPairHarness:spec/goldveinPair.spec \
	--cache GoldVeinPairHarness \
	--msg "GoldVeinPairHarness" 
