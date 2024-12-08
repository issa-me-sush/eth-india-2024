import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useRouter } from 'next/router';
import { TOURNAMENT_MODES } from '../../config/tournamentModes';
import { toast } from 'react-hot-toast';

export default function CreateTournament() {
  const router = useRouter();
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    mode: 'AGENT_CHALLENGE',
    isAutoGenerated: true,
    entryFee: '0.01',
    maxParticipants: '100',
    agentInstructions: '',
    creatorAddress: '',
    duration: '60',
    debateTopic: '',
    secretTerm: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (wallets && wallets.length > 0) {
      setFormData(prev => ({
        ...prev,
        creatorAddress: wallets[0].address
      }));
    }
  }, [wallets]);

  useEffect(() => {
    if (ready && !authenticated) {
      router.push('/');
    }
  }, [authenticated, ready, router]);

  useEffect(() => {
    if (formData.mode === 'AGENT_CHALLENGE' && formData.isAutoGenerated) {
      generateChallenge();
    }
  }, [formData.mode, formData.isAutoGenerated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.mode === 'AGENT_CHALLENGE') {
        if (!formData.isAutoGenerated && !formData.agentInstructions) {
          throw new Error('Custom challenge rules are required');
        }
      } else if (formData.mode === 'DEBATE_ARENA') {
        if (!formData.debateTopic) {
          throw new Error('Debate topic is required');
        }
      } else if (formData.mode === 'TWENTY_QUESTIONS') {
        if (!formData.secretTerm) {
          throw new Error('Secret term is required');
        }
        formData.challengeStatement = `Try to guess the secret term by asking yes/no questions. You have ${formData.maxAttempts || 20} questions to figure it out!`;
      }

      if (formData.mode === 'DEBATE_ARENA') {
        formData.challengeStatement = `Debate Topic: ${formData.debateTopic}\n\nParticipate in this structured debate. Present your arguments clearly and respond to others' points. An AI judge will evaluate responses based on logic, evidence, and argumentation quality.`;
      }

      const response = await fetch('/api/tournaments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tournament');
      }

      router.push('/tournaments');
    } catch (error) {
      console.error('Error creating tournament:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const generateChallenge = async () => {
    if (!formData.isAutoGenerated) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instructions: formData.agentInstructions // Pass any custom preferences
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate challenge');
      }

      const data = await response.json();
      setFormData(prev => ({
        ...prev,
        challengeStatement: data.challenge
      }));
    } catch (error) {
      console.error('Error generating challenge:', error);
      toast.error('Failed to generate challenge');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderModeSpecificFields = () => {
    switch (formData.mode) {
      case 'AGENT_CHALLENGE':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-cyan-400 block">Challenge Type</label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.isAutoGenerated}
                    onChange={() => setFormData({...formData, isAutoGenerated: true})}
                    className="hidden"
                  />
                  <div className={`text-center p-3 rounded-xl ${
                    formData.isAutoGenerated 
                      ? 'bg-purple-500/20 border-purple-500' 
                      : 'bg-gray-800/50 border-gray-700'
                  } border`}>
                    AI Generated
                  </div>
                </label>
                <label className="flex-1 cursor-pointer">
                  <input
                    type="radio"
                    checked={!formData.isAutoGenerated}
                    onChange={() => setFormData({...formData, isAutoGenerated: false})}
                    className="hidden"
                  />
                  <div className={`text-center p-3 rounded-xl ${
                    !formData.isAutoGenerated 
                      ? 'bg-purple-500/20 border-purple-500' 
                      : 'bg-gray-800/50 border-gray-700'
                  } border`}>
                    Custom Rules
                  </div>
                </label>
              </div>
            </div>

            {!formData.isAutoGenerated && (
              <div className="space-y-2">
                <label className="text-cyan-400 block">Challenge Rules</label>
                <textarea
                  value={formData.agentInstructions}
                  onChange={(e) => setFormData({...formData, agentInstructions: e.target.value})}
                  className="w-full h-32 bg-gray-800/50 rounded-lg p-3 text-white"
                  placeholder="Describe your challenge rules and winning conditions..."
                  required
                />
              </div>
            )}

            {formData.challengeStatement && (
              <div className="space-y-2">
                <label className="text-cyan-400 block">Generated Challenge</label>
                <div className="bg-gray-800/50 rounded-lg p-4 text-white">
                  {formData.challengeStatement}
                </div>
              </div>
            )}
          </div>
        );

      case 'DEBATE_ARENA':
        return (
          <div className="space-y-2">
            <label className="text-cyan-400 block">Debate Topic</label>
            <input
              type="text"
              value={formData.debateTopic}
              onChange={(e) => setFormData({...formData, debateTopic: e.target.value})}
              className="w-full bg-gray-800/50 rounded-lg p-3 text-white"
              placeholder="Enter the topic for debate..."
              required
            />
          </div>
        );

      case 'TWENTY_QUESTIONS':
        return (
          <div className="space-y-2">
            <label className="text-cyan-400 block">Secret Term</label>
            <input
              type="text"
              value={formData.secretTerm}
              onChange={(e) => setFormData({...formData, secretTerm: e.target.value})}
              className="w-full bg-gray-800/50 rounded-lg p-3 text-white"
              placeholder="Enter the term players need to guess..."
              required
            />
          </div>
        );

      default:
        return null;
    }
  };

  if (!ready) return <div>Loading...</div>;
  if (ready && !authenticated) return null;

  return (
    <div className="min-h-screen pt-20 p-4">
      <main className="container mx-auto max-w-2xl">
        <h1 className="text-4xl font-bold text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          Create Tournament
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
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
            <label className="text-cyan-400 block">Tournament Mode</label>
            <div className="grid grid-cols-1 gap-4">
              {Object.entries(TOURNAMENT_MODES).map(([key, mode]) => (
                <label key={key} className={`relative flex items-center p-4 rounded-xl cursor-pointer
                  ${formData.mode === key ? `bg-${mode.color}-500/20` : 'bg-gray-800/50'}`}>
                  <input
                    type="radio"
                    name="mode"
                    value={key}
                    checked={formData.mode === key}
                    onChange={(e) => setFormData({...formData, mode: e.target.value})}
                    className="hidden"
                  />
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{mode.icon}</span>
                    <div>
                      <h3 className="font-bold text-white">{mode.name}</h3>
                      <p className="text-sm text-gray-400">{mode.description}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {renderModeSpecificFields()}

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
            <label className="text-cyan-400 block">
              {formData.mode === 'AGENT_CHALLENGE' 
                ? formData.isAutoGenerated 
                  ? 'AI Challenge Preferences (Optional)'
                  : 'Custom Challenge Rules'
                : formData.mode === 'DEBATE_ARENA'
                ? 'Judging Criteria (Optional)'
                : 'Additional Instructions (Optional)'
              }
            </label>
            <textarea
              value={formData.agentInstructions}
              onChange={(e) => setFormData({...formData, agentInstructions: e.target.value})}
              className="w-full h-32 bg-gray-800/50 rounded-lg p-3 text-white"
              placeholder={formData.mode === 'AGENT_CHALLENGE'
                ? TOURNAMENT_MODES.AGENT_CHALLENGE.defaultInstructions[formData.isAutoGenerated ? 'auto' : 'custom']
                : TOURNAMENT_MODES[formData.mode].defaultInstructions
              }
              required={formData.mode === 'AGENT_CHALLENGE' && !formData.isAutoGenerated}
            />
            <p className="text-sm text-gray-400">
              {formData.mode === 'AGENT_CHALLENGE' && !formData.isAutoGenerated
                ? 'Specify your challenge rules and winning conditions'
                : 'Leave empty to use default instructions'}
            </p>
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