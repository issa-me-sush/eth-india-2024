import { defineChain } from 'viem'

export const supraStaging = defineChain({
  id: 231,
  name: 'Supra Staging',
  network: 'supra-staging',
  nativeCurrency: {
    decimals: 18,
    name: 'SUPRA',
    symbol: 'SUPRA',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-evmstaging.supra.com/rpc/v1/eth'],
    },
    public: {
      http: ['https://rpc-evmstaging.supra.com/rpc/v1/eth'],
    },
  },
  // No block explorer available
  blockExplorers: {
    default: { name: 'Supra Staging', url: '' },
  },
}) 

export const citreaTestnet = defineChain({
    id: 5115,
    name: 'Citrea Testnet',
    network: 'citrea-testnet',
    nativeCurrency: {
      decimals: 18,
      name: 'Citrea BTC',
      symbol: 'cBTC',
    },
    rpcUrls: {
      default: {
        http: ['https://rpc.testnet.citrea.xyz'],
      },
    },
    blockExplorers: {
      default: { name: 'Citrea Explorer', url: 'https://explorer.testnet.citrea.xyz' },
    },
  });