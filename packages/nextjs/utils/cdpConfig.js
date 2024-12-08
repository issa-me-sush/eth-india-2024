import { Coinbase } from "@coinbase/coinbase-sdk";

// Initialize CDP SDK for browser environment
export const initializeCDP = () => {
  try {
    // Configure CDP directly with key values instead of reading from file
    const coinbase = new Coinbase({ 
      apiKeyName: process.env.NEXT_PUBLIC_CDP_API_KEY_NAME,
      privateKey: process.env.CDP_API_KEY_PRIVATE_KEY,
      config: {
        networkId: 'base-sepolia', // or your preferred network
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
      }
    });
    
    return coinbase;
  } catch (error) {
    console.error('Failed to initialize CDP:', error);
    throw new Error('CDP initialization failed');
  }
};

// Helper to check if we're in browser environment
export const isBrowser = typeof window !== 'undefined'; 