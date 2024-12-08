import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/router';

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const { authenticated, user } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    const response = await fetch('/api/tournaments');
    const data = await response.json();
    setTournaments(data);
  };

  const enterTournament = async (tournamentId) => {
    if (!authenticated) {
      return router.push('/login');
    }
    
    // Here we'll add the logic to handle tournament entry
    // Including ticket spending and starting the challenge
  };

  return (
    <div className="min-h-screen pt-20 p-4">
      <main className="container mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Active Tournaments
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tournaments.map((tournament) => (
            <div 
              key={tournament._id} 
              className="bg-black/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20"
            >
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">
                {tournament.name}
              </h2>
              <div className="space-y-2 mb-4">
                <p className="text-purple-400">
                  Difficulty: <span className="text-white">{tournament.difficulty}</span>
                </p>
                <p className="text-purple-400">
                  Entry Cost: <span className="text-white">{tournament.ticketCost} tickets</span>
                </p>
                <p className="text-purple-400">
                  Entries: <span className="text-white">{tournament.currentEntries}/{tournament.maxEntries}</span>
                </p>
              </div>
              <button
                onClick={() => enterTournament(tournament._id)}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                disabled={tournament.currentEntries >= tournament.maxEntries}
              >
                Enter Tournament
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
} 