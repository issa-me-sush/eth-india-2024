import { useState } from 'react';
import { useOkto } from 'okto-sdk-react';

export default function Home() {
  const { isConnected, address, showWidgetModal } = useOkto();

  return (
    <div className="min-h-screen pt-20 p-4 bg-gradient-to-br from-black via-purple-900 to-black">
      <main className="container mx-auto max-w-4xl">
        <h1 className="text-6xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          {/* Neural Garden */}
        </h1>

        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-8 border border-purple-500/20">
          {/* Main Content */}
          <div className="space-y-6 text-center">
            <p className="text-xl text-cyan-400">
              Your Gateway to the AI-Powered Digital Playground
            </p>
            
            <p className="text-gray-300 text-lg">
              Explore a boundless realm where AI meets creativity. Engage in debates, 
              create digital art, solve puzzles, and participate in unique AI-driven 
              experiences. Neural Garden is your space to learn, create, and evolve.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              <button
                onClick={() => window.location.href = '/neural-garden'}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105"
              >
                Enter Neural Garden
              </button>
              
              <button
                onClick={() => window.location.href = '/create-new'}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-4 px-6 rounded-lg transition duration-300 transform hover:scale-105"
              >
                Create New Experience
              </button>
            </div>
          </div>

          {/* Connect Wallet Section */}
          <div className="mt-8 text-center">
            {isConnected ? (
              <div className="text-cyan-400 font-mono">
                Connected: {address}
              </div>
            ) : (
              <button 
                onClick={showWidgetModal}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Connect Wallet
              </button>
            )}
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <h3 className="text-lg font-bold text-cyan-400 mb-2">AI Playground</h3>
              <p className="text-gray-300">Experiment with cutting-edge AI tools and create unique digital experiences</p>
            </div>
            <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <h3 className="text-lg font-bold text-cyan-400 mb-2">Neural Rewards</h3>
              <p className="text-gray-300">Earn tokens for your contributions and creative endeavors</p>
            </div>
            <div className="p-4 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <h3 className="text-lg font-bold text-cyan-400 mb-2">Community Hub</h3>
              <p className="text-gray-300">Connect with like-minded innovators in our decentralized ecosystem</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}