import dbConnect from '../../../../lib/dbConnect';
import Tournament from '../../../../models/Tournament';
import { distributePrizes } from '../../../../utils/prizeDistribution';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { id } = req.query;
    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Determine winners based on mode
    let winners = [];
    switch (tournament.mode) {
      case 'DEBATE_ARENA':
        winners = determineDebateWinners(tournament);
        break;
      case 'TWENTY_QUESTIONS':
        winners = determineTwentyQuestionsWinners(tournament);
        break;
      case 'AGENT_CHALLENGE':
        winners = [tournament.participants.find(p => p.hasCompleted)?.address];
        break;
    }

    if (!winners.length) {
      return res.status(400).json({ error: 'No winners found' });
    }

    // Distribute prizes
    const transfers = await distributePrizes(tournament, winners);

    // Update tournament status
    tournament.status = 'COMPLETED';
    tournament.winners = winners;
    tournament.prizeDistribution = transfers.map(t => ({
      address: t.destination,
      amount: t.amount
    }));

    await tournament.save();

    res.status(200).json({ 
      message: 'Tournament completed and prizes distributed',
      winners,
      transfers 
    });

  } catch (error) {
    console.error('Tournament completion error:', error);
    res.status(500).json({ error: 'Failed to complete tournament' });
  }
}

function determineDebateWinners(tournament) {
  return tournament.participants
    .sort((a, b) => b.score - a.score)
    .filter(p => p.score > 0)
    .map(p => p.address);
}

function determineTwentyQuestionsWinners(tournament) {
  return tournament.participants
    .sort((a, b) => a.guessCount - b.guessCount)
    .filter(p => p.hasGuessedCorrect)
    .map(p => p.address);
} 