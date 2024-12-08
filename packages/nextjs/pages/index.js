import { useState } from 'react';
import { useOkto } from 'okto-sdk-react';

export default function Home() {
  const [playerInput, setPlayerInput] = useState('');
  const [attempts, setAttempts] = useState(3);
  const [gameHistory, setGameHistory] = useState([]);
  const [gameStatus, setGameStatus] = useState('ready'); // ready, playing, won, lost
  const [currentRiddle, setCurrentRiddle] = useState(
    "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?"
  );

  const { isConnected, address , showWidgetModal} = useOkto()

  const handleAttempt = async (e) => {
    e.preventDefault();
    if (attempts <= 0 || gameStatus !== 'playing') return;

    try {
      const response = await fetch('/api/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ attempt: playerInput }),
      });

      const data = await response.json();

      setGameHistory(prev => [...prev, {
        attempt: 4 - attempts,
        playerMessage: playerInput,
        aiResponse: data.message,
        success: data.success
      }]);

      setAttempts(prev => prev - 1);
      setPlayerInput('');

      if (data.success) {
        setGameStatus('won');
      } else if (attempts <= 1) {
        setGameStatus('lost');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const startNewGame = () => {
    setAttempts(3);
    setGameHistory([]);
    setGameStatus('playing');
  };

  return (
    <div className="min-h-screen pt-20 p-4">
      <main className="container mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Neural Garden
        </h1>

        <div className="bg-black/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
          {/* Current Riddle Display */}
          {gameStatus === 'playing' && (
            <div className="mb-6 text-center">
              <h2 className="text-xl text-cyan-400 mb-2">The Riddle:</h2>
              <p className="text-lg">{currentRiddle}</p>
            </div>
          )}

          {/* Attempts Counter */}
          <div className="text-purple-400 text-center mb-4">
            Attempts Remaining: {attempts}
          </div>

          {/* Game Controls */}
          {gameStatus === 'ready' && (
            <button
              onClick={startNewGame}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300 mb-4"
            >
              Begin Challenge
            </button>
          )}

          {/* Input Area */}
          {gameStatus === 'playing' && (
            <form onSubmit={handleAttempt} className="space-y-4">
              <input
                type="text"
                className="w-full bg-gray-800/50 rounded-lg p-3 text-white placeholder-gray-400 border border-purple-500/20"
                placeholder="Enter your answer..."
                value={playerInput}
                onChange={(e) => setPlayerInput(e.target.value)}
              />
              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              >
                Submit Answer
              </button>
            </form>
          )}

          {/* Game Over States */}
          {gameStatus === 'won' && (
            <div className="text-center space-y-4">
              <h2 className="text-2xl text-green-400">Challenge Completed!</h2>
              <button
                onClick={startNewGame}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Try Another Riddle
              </button>
            </div>
          )}

          {gameStatus === 'lost' && (
            <div className="text-center space-y-4">
              <h2 className="text-2xl text-red-400">Challenge Failed</h2>
              <button
                onClick={startNewGame}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Conversation History */}
          <div className="mt-8 space-y-4">
            {gameHistory.map((entry, index) => (
              <div key={index} className={`p-4 rounded-lg ${entry.success ? 'bg-green-900/20' : 'bg-gray-800/20'}`}>
                <div className="text-purple-400 mb-2">Attempt {entry.attempt}:</div>
                <div className="mb-2">Your Answer: {entry.playerMessage}</div>
                <div className="text-cyan-400">Response: {entry.aiResponse}</div>
              </div>
            ))}
          </div>

          {isConnected ? (
            <div>Connected: {address}</div>
          ) : (
            <button onClick={showWidgetModal}>Connect Wallet</button>
          )}
        </div>
      </main>
    </div>
  );
}