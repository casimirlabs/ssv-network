// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity 0.8.18;

import "./ISSVNetworkCore.sol";
import "./functions/IFnSSVOperators.sol";
import "./functions/IFnSSVClusters.sol";
import "./functions/IFnSSVDAO.sol";
import "./functions/IFnSSVViews.sol";

import {SSVModules} from "../libraries/SSVStorage.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../libraries/RegisterAuth.sol";

interface ISSVNetwork is ISSVNetworkCore, IFnSSVOperators, IFnSSVClusters, IFnSSVDAO {
    function initialize(
        IERC20 token_,
        IFnSSVOperators ssvOperators_,
        IFnSSVClusters ssvClusters_,
        IFnSSVDAO ssvDAO_,
        IFnSSVViews ssvViews_,
        uint64 minimumBlocksBeforeLiquidation_,
        uint256 minimumLiquidationCollateral_,
        uint32 validatorsPerOperatorLimit_,
        uint64 declareOperatorFeePeriod_,
        uint64 executeOperatorFeePeriod_,
        uint64 operatorMaxFeeIncrease_
    ) external;

    function upgradeModule(SSVModules moduleId, address moduleAddress) external;

    function setRegisterAuth(address userAddress, Authorization calldata auth) external;

    function getRegisterAuth(address userAddress) external view returns (Authorization memory);
}