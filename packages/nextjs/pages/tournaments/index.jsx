import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';
import { TOURNAMENT_MODES, PRIZE_DISTRIBUTIONS } from '../../config/tournamentModes';

// Challenge Modal Component
const ChallengeModal = ({ isOpen, onClose, challenge }) => {
  if (!isOpen) return null;

  // Function to format markdown-style text
  const formatText = (text) => {
    return text
      .split('\n')
      .map((line, index) => {
        // Handle bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-purple-400">$1</span>');
        
        // Handle bullet points
        if (line.trim().startsWith('-')) {
          return `<li class="ml-4 text-gray-300">${line.substring(1)}</li>`;
        }
        
        // Handle numbered lists
        if (/^\d+\./.test(line.trim())) {
          return `<li class="ml-4 text-gray-300">${line}</li>`;
        }
        
        return `<p class="text-gray-300">${line}</p>`;
      })
      .join('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl relative border border-purple-500/20">
        {/* Header */}
        <div className="p-6 border-b border-purple-500/20">
          <h3 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Challenge Details
          </h3>
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <div 
            className="prose prose-invert max-w-none space-y-4"
            dangerouslySetInnerHTML={{ __html: formatText(challenge) }}
          />
        </div>
      </div>
    </div>
  );
};

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { authenticated, user } = usePrivy();
  const router = useRouter();
  const { wallets } = useWallets();
  const [enteringStates, setEnteringStates] = useState({});
  const [userAttempts, setUserAttempts] = useState({});
  const [selectedChallenge, setSelectedChallenge] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchUserAttempts = async (tournaments) => {
    if (!authenticated || !wallets[0]) return;
    
    const userAddress = await wallets[0].address;
    const attempts = {};
    
    tournaments.forEach(tournament => {
      const participant = tournament.participants?.find(
        p => p.address.toLowerCase() === userAddress.toLowerCase()
      );
      attempts[tournament._id] = participant?.attemptsLeft || 0;
    });
    
    setUserAttempts(attempts);
  };

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tournaments');
      if (!response.ok) {
        throw new Error('Failed to fetch tournaments');
      }
      const data = await response.json();
      
      
     // In the fetchTournaments function
const tournamentsWithCorrectCount = data.map(tournament => ({
  ...tournament,
  currentParticipants: tournament.currentParticipants 
}));
      
      setTournaments(tournamentsWithCorrectCount);
      await fetchUserAttempts(tournamentsWithCorrectCount);
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const enterTournament = async (tournament) => {
    if (!authenticated) {
      return router.push('/login');
    }

    try {
      // Set loading state for this specific tournament only
      setEnteringStates(prev => ({
        ...prev,
        [tournament._id]: true
      }));

      const wallet = wallets[0];
      
      if (!wallet || !window.ethereum) {
        throw new Error('No wallet connected');
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const userAddress = await signer.getAddress();

      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // Send entry fee to treasury
      const tx = await signer.sendTransaction({
        to: tournament.treasuryAddress,
        value: ethers.utils.parseEther(tournament.entryFee.toString()),
        chainId: 84532
      });

      await tx.wait();

      // Register entry with backend
      const response = await fetch(`/api/tournaments/${tournament._id}/enter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress,
          transactionHash: tx.hash
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to enter tournament');
      }

      // Update attempts for this specific tournament
      setUserAttempts(prev => ({
        ...prev,
        [tournament._id]: data.attemptsLeft || prev[tournament._id]
      }));

      await fetchTournaments();
      toast.success('Successfully entered tournament!');
    } catch (error) {
      console.error('Error entering tournament:', error);
      toast.error(error.message || 'Failed to enter tournament');
    } finally {
      // Clear loading state for this specific tournament only
      setEnteringStates(prev => ({
        ...prev,
        [tournament._id]: false
      }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-20 p-4 bg-gradient-to-b from-gray-900 to-black">
        <main className="container mx-auto max-w-6xl text-center">
          <div className="animate-pulse text-purple-400">Loading tournaments...</div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 p-4 bg-gradient-to-b from-gray-900 to-black">
        <main className="container mx-auto max-w-6xl text-center">
          <div className="text-red-400">Error: {error}</div>
          <button 
            onClick={fetchTournaments}
            className="mt-4 px-4 py-2 bg-purple-500 rounded-lg hover:bg-purple-600"
          >
            Retry
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 p-4 bg-gradient-to-b from-gray-900 to-black">
      <main className="container mx-auto max-w-6xl">
        {/* <h1 className="text-5xl font-bold text-center mb-12 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 animate-gradient">
          Neural Arena ({tournaments.length})
        </h1> */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tournaments.map((tournament) => (
            <div key={tournament._id} 
              className="group relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20">
              {/* Status Badge */}
              <div className={`
                absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold z-10
                ${tournament.status === 'ACTIVE'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
                }
              `}>
                {tournament.status}
              </div>

              {/* Mode Badge */}
              <div className={`
                absolute top-4 left-4 px-3 py-1 rounded-full text-xs font-semibold z-10
                bg-${TOURNAMENT_MODES[tournament.mode].color}-500/20 
                text-${TOURNAMENT_MODES[tournament.mode].color}-400 
                border border-${TOURNAMENT_MODES[tournament.mode].color}-500/50
              `}>
                {TOURNAMENT_MODES[tournament.mode].icon} {TOURNAMENT_MODES[tournament.mode].name}
              </div>

              {/* Card Content */}
              <div className="relative m-[1px] rounded-2xl bg-black/90 backdrop-blur-xl p-6 h-full">
                <div className="space-y-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent mt-8">
                    {tournament.name}
                  </h2>

                  {/* Mode-specific details */}
                  {tournament.mode === 'AGENT_CHALLENGE' && (
                    <div className="text-sm text-gray-400">
                      {tournament.isAutoGenerated ? '🤖 AI Generated Challenge' : '👤 Custom Challenge Rules'}
                    </div>
                  )}

                  {tournament.mode === 'DEBATE_ARENA' && (
                    <div className="text-sm text-gray-400">
                      Topic: {tournament.debateTopic}
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-1">
                      <p className="text-xs text-purple-400">Entry Fee</p>
                      <p className="text-lg font-semibold text-white">
                        {tournament.entryFee} ETH
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-purple-400">Prize Pool</p>
                      <p className="text-lg font-semibold text-white capitalize">
                        {tournament.prizeDistribution.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-purple-400">Total Slots</p>
                      <p className="text-lg font-semibold text-white">
                        {tournament.maxParticipants}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-purple-400">Filled Slots</p>
                      <p className="text-lg font-semibold text-white">
                        {tournament.currentParticipants || 0}
                      </p>
                    </div>
                    
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-purple-400">Agent Address {`(Treasury)`}</p>
                      <p className="text-sm font-mono text-gray-300 break-all">
                        {tournament.treasuryAddress}
                      </p>
                    </div>

                    {authenticated && userAttempts[tournament._id] > 0 && (
                      <div className="col-span-2 space-y-1">
                        <p className="text-xs text-purple-400">Your Attempts</p>
                        <p className="text-lg font-semibold text-white">
                          {userAttempts[tournament._id]} remaining
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Mode-specific action button */}
                  {tournament.mode === 'AGENT_CHALLENGE' && (
                    <button
                      onClick={() => setSelectedChallenge(tournament.challengeStatement)}
                      className="w-full py-2 px-4 rounded-xl font-medium text-sm 
                        bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 
                        transition-all duration-300 border border-purple-500/20"
                    >
                      View Challenge
                    </button>
                  )}

                  {/* Enter Tournament Button */}
                  <button
                    onClick={() => enterTournament(tournament)}
                    disabled={enteringStates[tournament._id] || tournament.status !== 'ACTIVE' || tournament.currentParticipants >= tournament.maxParticipants}
                    className={`
                      w-full py-3 px-4 rounded-xl font-bold transition-all duration-300
                      ${enteringStates[tournament._id] ? 'bg-gray-600 text-gray-400 cursor-wait' :
                        tournament.status !== 'ACTIVE' ? 'bg-gray-600 text-gray-400 cursor-not-allowed' :
                        tournament.currentParticipants >= tournament.maxParticipants
                          ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg hover:shadow-purple-500/50'
                      }
                    `}
                  >
                    {enteringStates[tournament._id] ? 'Processing...' :
                      tournament.status !== 'ACTIVE' ? 'Tournament Inactive' :
                      tournament.currentParticipants >= tournament.maxParticipants 
                        ? 'Tournament Full' 
                        : 'Enter Tournament'
                    }
                  </button>

                  {/* Enter Arena Button */}
                  <button
                    onClick={() => router.push(`/arena/${tournament._id}`)}
                    className={`
                      w-full py-3 px-4 rounded-xl font-bold 
                      ${userAttempts[tournament._id] > 0 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500'
                        : 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600'
                      }
                      text-white shadow-lg hover:shadow-purple-500/50
                      transition-all duration-300
                    `}
                  >
                    {userAttempts[tournament._id] > 0 ? 'Enter Arena' : 'View Arena'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Challenge Modal */}
        <ChallengeModal 
          isOpen={!!selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          challenge={selectedChallenge}
        />

        {/* Create Tournament Button */}
        {authenticated && (
          <div className="fixed bottom-8 right-8">
            <button
              onClick={() => router.push('/tournaments/create')}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 
                text-white rounded-full p-4 shadow-lg shadow-purple-500/25
                transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        )}
      </main>
    </div>
  );
} 