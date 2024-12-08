import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';

const Message = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center
        ${isUser ? 'bg-purple-500' : 'bg-cyan-500'}`}>
        {isUser ? '👤' : '🤖'}
      </div>
      
      <div className={`max-w-[70%] px-4 py-2 rounded-2xl break-words
        ${isUser 
          ? 'bg-purple-500/20 text-purple-100' 
          : 'bg-gray-700/50 text-gray-200'
        }`}>
        {message.content}
      </div>
    </div>
  );
};

export default function Arena() {
  const router = useRouter();
  const { id } = router.query;
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [tournament, setTournament] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const [canSendMessages, setCanSendMessages] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [enteringStates, setEnteringStates] = useState({});
  const [userAttempts, setUserAttempts] = useState({});
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    if (id) {
      fetchTournament();
    }
  }, [id]);

  const fetchTournament = async () => {
    try {
      const response = await fetch(`/api/tournaments/${id}`);
      if (!response.ok) throw new Error('Failed to fetch tournament');
      const data = await response.json();
      setTournament(data);
      setMessages(data.messages || []);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load tournament');
      router.push('/tournaments');
    }
  };

  useEffect(() => {
    const checkMessagePermission = async () => {
      if (!tournament || !authenticated || !wallets[0]) return;
      const userAddress = await wallets[0].address;
      const participant = tournament.participants?.find(
        p => p.address.toLowerCase() === userAddress.toLowerCase()
      );
      setCanSendMessages(participant?.attemptsLeft > 0);
    };
    checkMessagePermission();
  }, [tournament, authenticated, wallets]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (message) => {
    try {
      setSending(true);
      
      const userAddress = await wallets[0]?.address;
      if (!userAddress) {
        toast.error('No wallet connected');
        return;
      }

      // Add optimistic message update
      const optimisticUserMessage = { 
        role: 'user', 
        content: message, 
        timestamp: new Date() 
      };
      
      setMessages(prev => [...prev, optimisticUserMessage]);
      setInput(''); // Clear input immediately after sending

      const response = await fetch(`/api/arena/${id}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userAddress
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg !== optimisticUserMessage));
        toast.error(data.error || 'Failed to send message');
        return;
      }

      // Update messages with AI response
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: data.message, 
          timestamp: new Date() 
        }
      ]);

      // Update attempts if provided
      if (data.attemptsLeft !== undefined) {
        setAttempts(data.attemptsLeft);
      }

      // Check for tournament completion
      if (data.tournamentCompleted) {
        toast.success('Tournament completed!');
        if (data.winners?.includes(userAddress?.toLowerCase())) {
          toast.success('Congratulations! You are a winner!');
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg !== optimisticUserMessage));
    } finally {
      setSending(false);
    }
  };

  const enterTournament = async (tournament) => {
    if (!authenticated) {
      return router.push('/login');
    }

    try {
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

      await window.ethereum.request({ method: 'eth_requestAccounts' });

      const tx = await signer.sendTransaction({
        to: tournament.treasuryAddress,
        value: ethers.utils.parseEther(tournament.entryFee.toString()),
        chainId: 84532
      });

      await tx.wait();

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

      setUserAttempts(prev => ({
        ...prev,
        [tournament._id]: data.attemptsLeft || prev[tournament._id]
      }));

      toast.success('Successfully entered tournament!');
    } catch (error) {
      console.error('Error entering tournament:', error);
      toast.error(error.message || 'Failed to enter tournament');
    } finally {
      setEnteringStates(prev => ({
        ...prev,
        [tournament._id]: false
      }));
    }
  };

  const resolveDebate = async () => {
    try {
      const response = await fetch(`/api/tournaments/${id}/debateEnd`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to resolve debate');
      }

      toast.success('Debate resolved and prizes distributed!');
      setWinners(data.winners);
    } catch (error) {
      console.error('Error resolving debate:', error);
      toast.error(error.message || 'Failed to resolve debate');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pt-20 p-4">
        <div className="text-purple-400 text-center">Loading arena...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pt-20 p-4">
      <div className="container mx-auto max-w-4xl">
      <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-purple-500/20">
  <div className="flex flex-col md:flex-row justify-between gap-6">
    {/* Tournament Details */}
    <div className="flex-1">
      <h2 className="text-xl font-bold text-purple-400 mb-4">
        {tournament?.name}
      </h2>
      <p className="text-gray-300 mb-4">
        {tournament?.challengeStatement}
      </p>
      
      {/* Tournament Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
        <div className="bg-gray-700/30 p-2 rounded-lg">
          <div className="text-xs text-gray-400">Entry Fee</div>
          <div className="text-sm text-purple-300 truncate">{tournament?.entryFee} ETH</div>
        </div>
        <div className="bg-gray-700/30 p-2 rounded-lg">
          <div className="text-xs text-gray-400">Participants</div>
          <div className="text-sm text-purple-300 truncate">
            {tournament?.currentParticipants}/{tournament?.maxParticipants}
          </div>
        </div>
        <div className="bg-gray-700/30 p-2 rounded-lg">
          <div className="text-xs text-gray-400">Mode</div>
          <div className="text-sm text-purple-300 truncate">{tournament?.mode}</div>
        </div>
        <div className="bg-gray-700/30 p-2 rounded-lg">
          <div className="text-xs text-gray-400">Prize Pool</div>
          <div className="text-sm text-purple-300 truncate">
            {tournament?.currentParticipants * tournament?.entryFee} ETH
          </div>
        </div>
        <div className="bg-gray-700/30 p-2 rounded-lg">
          <div className="text-xs text-gray-400">Distribution</div>
          <div className="text-sm text-purple-300 truncate">{tournament?.prizeDistribution}</div>
        </div>
        <div className="bg-gray-700/30 p-2 rounded-lg">
          <div className="text-xs text-gray-400">Status</div>
          <div className="text-sm text-purple-300 truncate">{tournament?.status}</div>
        </div>
      </div>
    </div>

    {/* Entry Button Section */}
    <div className="flex flex-col justify-center items-center gap-3 min-w-[200px]">
      <button
        onClick={() => enterTournament(tournament)}
        disabled={enteringStates[tournament._id] || tournament.status !== 'ACTIVE' || tournament.currentParticipants >= tournament.maxParticipants}
        className={`
          w-full px-6 py-3 bg-purple-500 hover:bg-purple-400 
          text-white font-medium rounded-xl transition-colors
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

      {/* Resolve Debate Button */}
      {tournament?.mode === 'DEBATE_ARENA' && (
        <button
          onClick={resolveDebate}
          className="w-full px-6 py-3 mt-2 bg-red-500 hover:bg-red-400 text-white font-medium rounded-xl transition-colors"
        >
          Resolve Debate
        </button>
      )}

      {canSendMessages && (
        <div className="bg-gray-700/30 px-4 py-2 rounded-lg">
          <div className="text-xs text-gray-400">Attempts Left</div>
          <div className="text-sm text-purple-300 text-center font-medium">
            {attempts}
          </div>
        </div>
      )}
    </div>
  </div>
</div>

        {/* Display Winners */}
        {winners.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-purple-500/20">
            <h3 className="text-lg font-bold text-purple-400 mb-4">Winners</h3>
            <ul>
              {winners.map((winner, index) => (
                <li key={index} className="text-gray-300">
                  {index + 1}. {winner.address} - {winner.prize} ETH
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="bg-gray-800/50 rounded-xl border border-purple-500/20">
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((message, index) => (
              <Message key={index} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-purple-500/20 p-4">
            {canSendMessages ? (
              <form onSubmit={(e) => {
                e.preventDefault(); // Prevent form from submitting normally
                if (input.trim()) {
                  sendMessage(input);
                  setInput(''); // Clear input after sending
                }
              }} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700/50 rounded-xl px-4 py-3 text-white placeholder-gray-400 
                    focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className={`px-6 rounded-xl font-medium
                    ${sending || !input.trim()
                      ? 'bg-gray-700 text-gray-400'
                      : 'bg-purple-500 text-white hover:bg-purple-400'
                    }`}
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </form>
            ) : (
              <div className="text-center text-gray-400 py-2">
                You need tournament tickets to participate in the challenge
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 