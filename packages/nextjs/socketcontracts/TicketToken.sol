// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "solady/tokens/ERC20.sol";

contract TicketToken is ERC20 {
    string private _name;
    string private _symbol;
    uint8 private _decimals;

    address public _SOCKET;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) {
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        _SOCKET = msg.sender;
    }

    error NotSOCKET();

    modifier onlySOCKET() {
        if (msg.sender != _SOCKET) revert NotSOCKET();
        _;
    }

    function mint(address to_, uint256 amount_) external onlySOCKET {
        _mint(to_, amount_);
    }

    function burn(uint256 amount_) external onlySOCKET {
        _burn(msg.sender, amount_);
    }

    function name() public view override returns (string memory) {
        return _name;
    }

    function symbol() public view override returns (string memory) {
        return _symbol;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }
}