// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "socket-protocol/contracts/base/AppGatewayBase.sol";
import "solady/auth/Ownable.sol";
import "./TicketToken.sol";

contract TicketAppGateway is AppGatewayBase, Ownable {
    mapping(uint32 => address) public agentAddresses; // Mapping of chain IDs to agent addresses
    mapping(address => uint256) public ticketHolders;

    constructor(
        address _addressResolver,
        address deployerContract_,
        FeesData memory feesData_
    ) AppGatewayBase(_addressResolver) Ownable() {
        addressResolver.setContractsToGateways(deployerContract_);
        _setFeesData(feesData_);
    }

    // Function to set agent addresses for different chains
    function setAgentAddress(uint32 chainId, address agentAddress) external onlyOwner {
        agentAddresses[chainId] = agentAddress;
    }

    function purchaseTicket(uint32 chainId, address _instance) external payable async {
        require(msg.value > 0, "ETH required to purchase ticket");
        uint256 ticketAmount = msg.value; // Define ticket price logic
        ticketHolders[msg.sender] += ticketAmount;

        address agentAddress = agentAddresses[chainId];
        require(agentAddress != address(0), "Agent address not set for this chain");

        // Mint tokens to the agent address
        TicketToken(_instance).mint(agentAddress, ticketAmount);
    }

    function burnTicket(uint32 chainId, address _instance, uint256 amount) external async {
        require(ticketHolders[msg.sender] >= amount, "Insufficient tickets");
        ticketHolders[msg.sender] -= amount;

        address agentAddress = agentAddresses[chainId];
        require(agentAddress != address(0), "Agent address not set for this chain");

        // Burn tokens from the agent address
        TicketToken(_instance).burn(amount);
    }
}