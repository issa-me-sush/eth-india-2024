import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/router';

export default function CreateTournament() {
  const router = useRouter();
  const { authenticated, user } = usePrivy();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    difficulty: 'easy',
    entryFee: '0.01',
    maxParticipants: '100',
    agentInstructions: ''
  });

  // Handle authentication redirect on client side
  useEffect(() => {
    if (!authenticated && typeof window !== 'undefined') {
      router.push('/');
    }
  }, [authenticated, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/tournaments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to create tournament');
      }

      if (typeof window !== 'undefined') {
        router.push('/tournaments');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Failed to create tournament: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading or nothing while checking authentication
  if (!authenticated) {
    return null;
  }

  return (
    <div className="min-h-screen pt-20 p-4">
      <main className="container mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Create Tournament
        </h1>

        <form onSubmit={handleSubmit} className="bg-black/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 space-y-6">
          <div className="space-y-2">
            <label className="text-cyan-400 block">Tournament Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-gray-800/50 rounded-lg p-3 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-cyan-400 block">Difficulty</label>
            <select
              value={formData.difficulty}
              onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
              className="w-full bg-gray-800/50 rounded-lg p-3 text-white"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-cyan-400 block">Entry Fee (ETH)</label>
            <input
              type="number"
              step="0.01"
              value={formData.entryFee}
              onChange={(e) => setFormData({...formData, entryFee: e.target.value})}
              className="w-full bg-gray-800/50 rounded-lg p-3 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-cyan-400 block">Max Participants</label>
            <input
              type="number"
              value={formData.maxParticipants}
              onChange={(e) => setFormData({...formData, maxParticipants: e.target.value})}
              className="w-full bg-gray-800/50 rounded-lg p-3 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-cyan-400 block">Agent Instructions</label>
            <textarea
              value={formData.agentInstructions}
              onChange={(e) => setFormData({...formData, agentInstructions: e.target.value})}
              className="w-full h-32 bg-gray-800/50 rounded-lg p-3 text-white"
              placeholder="Enter instructions for the AI agent..."
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50"
          >
            {isLoading ? 'Creating...' : 'Create Tournament'}
          </button>
        </form>
      </main>
    </div>
  );
}