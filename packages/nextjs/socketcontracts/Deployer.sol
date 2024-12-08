// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "./TicketToken.sol";
import "socket-protocol/contracts/base/AppDeployerBase.sol";

contract TicketTokenDeployer is AppDeployerBase {
    bytes32 public ticketToken = _createContractId("ticketToken");

    constructor(
        address addressResolver_,
        FeesData memory feesData_,
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) AppDeployerBase(addressResolver_) {
        creationCodeWithArgs[ticketToken] = abi.encodePacked(
            type(TicketToken).creationCode,
            abi.encode(name_, symbol_, decimals_)
        );
        _setFeesData(feesData_);
    }

    function deployContracts(uint32 chainSlug) external async {
        _deploy(ticketToken, chainSlug);
    }

    function initialize(uint32 chainSlug) public override async {}
}