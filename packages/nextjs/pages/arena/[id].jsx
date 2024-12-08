import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { toast } from 'react-hot-toast';

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
          <h2 className="text-xl font-bold text-purple-400 mb-4">
            {tournament?.name}
          </h2>
          <p className="text-gray-300">
            {tournament?.challengeStatement}
          </p>
        </div>

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