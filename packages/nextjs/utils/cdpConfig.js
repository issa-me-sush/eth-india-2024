import { Coinbase } from "@coinbase/coinbase-sdk";

// Initialize CDP SDK
export const initializeCDP = () => {
  try {
    // Configure CDP directly with key values instead of reading from file
    Coinbase.configure({
      apiKeyName: process.env.NEXT_PUBLIC_CDP_API_KEY_NAME,
      privateKey: process.env.NEXT_PUBLIC_CDP_PRIVATE_KEY,
      config: {
        networkId: 'base-sepolia', // or your preferred network
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'development'
      }
    });
  } catch (error) {
    console.error('Failed to initialize CDP:', error);
    throw new Error('CDP initialization failed');
  }
};

// Call this function at the start of your application
initializeCDP();

// Helper to check if we're in browser environment
export const isBrowser = typeof window !== 'undefined'; 