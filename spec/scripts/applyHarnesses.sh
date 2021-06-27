# SafeTransfer simplification
#sed -i 's/safeT/t/g' contracts/AlpinePlus.sol
#sed -i 's/safeT/t/g' contracts/LendingPair.sol
# Virtualize functions
perl -0777 -i -pe 's/public payable \{/public virtual payable \{/g' node_modules/@luckyfinance/alpine-sdk/contracts/AlpineV1.sol
perl -0777 -i -pe 's/external payable returns/external virtual payable returns/g' node_modules/@luckyfinance/alpine-sdk/contracts/AlpineV1.sol
perl -0777 -i -pe 's/external view returns \(uint256 /external virtual view returns \(uint256 /g' node_modules/@luckyfinance/alpine-sdk/contracts/AlpineV1.sol
perl -0777 -i -pe 's/uint256\[\] calldata amounts,\s+bytes calldata data\s+\) public/uint256\[\] calldata amounts,bytes calldata data\) public virtual/g' node_modules/@luckyfinance/alpine-sdk/contracts/AlpineV1.sol 
perl -0777 -i -pe 's/public payable/public virtual payable/g' contracts/GoldVeinPair.sol
perl -0777 -i -pe 's/public payable/public virtual payable/g' contracts/flat/GoldVeinPairFlat.sol
perl -0777 -i -pe 's/public \{/public virtual \{/g' contracts/flat/GoldVeinPairFlat.sol
perl -0777 -i -pe 's/public \{/public virtual \{/g' contracts/GoldVeinPair.sol
perl -0777 -i -pe 's/public view returns/public virtual view returns/g' contracts/GoldVeinPair.sol

perl -0777 -i -pe 's/internal view returns/internal virtual view returns/g' contracts/flat/GoldVeinPairFlat.sol
perl -0777 -i -pe 's/internal view returns/internal virtual view returns/g' contracts/GoldVeinPair.sol
perl -0777 -i -pe 's/external payable returns/external virtual payable returns/g' contracts/flat/GoldVeinPairFlat.sol
perl -0777 -i -pe 's/external payable returns/external virtual payable returns/g' contracts/GoldVeinPair.sol

# private constant
perl -0777 -i -pe 's/private constant / public constant /g' contracts/flat/GoldVeinPairFlat.sol 
perl -0777 -i -pe 's/private constant / public constant /g' contracts/GoldVeinPair.sol

# Virtualize modifier
perl -0777 -i -pe 's/modifier solvent\(\) \{/ modifier solvent\(\) virtual \{ /g' contracts/flat/GoldVeinPairFlat.sol 
perl -0777 -i -pe 's/modifier solvent\(\) \{/ modifier solvent\(\) virtual \{ /g' contracts/GoldVeinPair.sol 

# liquidation 
perl -0777 -i -pe 's/allBorrowAmount != 0/allBorrowAmount != 0 && allCollateralShare != 0/g' contracts/flat/GoldVeinPairFlat.sol 
perl -0777 -i -pe 's/allBorrowAmount != 0/allBorrowAmount != 0 && allCollateralShare != 0/g' contracts/GoldVeinPair.sol 

perl -0777 -i -pe 's/extraShare.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR / computeFee\(extraShare\) /g' contracts/flat/GoldVeinPairFlat.sol 
perl -0777 -i -pe 's/extraShare.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR / computeFee\(extraShare\) /g' contracts/GoldVeinPair.sol 

perl -0777 -i -pe 's/borrowAmount.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/s+\(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\) / computeCollateral\(borrowAmount, _exchangeRate\) /g' contracts/flat/GoldVeinPairFlat.sol 
perl -0777 -i -pe 's/borrowAmount.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/s+\(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\) / computeCollateral\(borrowAmount, _exchangeRate\) /g' contracts/GoldVeinPair.sol

perl -0777 -i -pe 's/function liquidate\( / 
function computeFee\(uint256 amount\) internal virtual returns \(uint256\) \{ return amount\.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR; \}\n function computeCollateral\(uint256 borrowAmount, uint256 _exchangeRate\) internal virtual returns \(uint256\) \{ return borrowAmount\.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/ \(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\); \}\n function liquidate\( /g'  contracts/flat/GoldVeinPairFlat.sol 
perl -0777 -i -pe 's/function liquidate\( / 
function computeFee\(uint256 amount\) internal virtual returns \(uint256\) \{ return amount\.mul\(PROTOCOL_FEE\) \/ PROTOCOL_FEE_DIVISOR; \}\n function computeCollateral\(uint256 borrowAmount, uint256 _exchangeRate\) internal virtual returns \(uint256\) \{ return borrowAmount\.mul\(LIQUIDATION_MULTIPLIER\)\.mul\(_exchangeRate\) \/ \(LIQUIDATION_MULTIPLIER_PRECISION \* EXCHANGE_RATE_PRECISION\); \}\n function liquidate\( /g'  contracts/GoldVeinPair.sol
 
# fix back constructor
perl -0777 -i -pe 's/constructor\(IAlpineV1 alPine_\) public virtual / constructor\(IAlpineV1 alPine_\) public  /g' contracts/flat/GoldVeinPairFlat.sol 
perl -0777 -i -pe 's/constructor\(IAlpineV1 alPine_\) public virtual / constructor\(IAlpineV1 alPine_\) public  /g' contracts/GoldVeinPair.sol
perl -0777 -i -pe 's/constructor\(\) public virtual/constructor\(\) public/g' contracts/flat/GoldVeinPairFlat.sol
perl -0777 -i -pe 's/constructor\(\) public virtual/constructor\(\) public/g' contracts/GoldVeinPair.sol
