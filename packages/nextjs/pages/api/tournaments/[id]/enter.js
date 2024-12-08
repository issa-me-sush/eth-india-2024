import { Wallet } from "@coinbase/coinbase-sdk";
import dbConnect from '../../../../lib/dbConnect';
import Tournament from '../../../../models/Tournament';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { id } = req.query;
    const { userAddress, transactionHash } = req.body;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Always increment currentParticipants as it represents slots used
    tournament.currentParticipants = (tournament.currentParticipants || 0) + 1;

    // Default to 5 attempts per entry if not specified
    const attemptsPerEntry = tournament.attemptsPerEntry || 5;

    // Check if user has participated before
    const existingParticipant = tournament.participants?.find(
      p => p.address.toLowerCase() === userAddress.toLowerCase()
    );

    if (existingParticipant) {
      existingParticipant.attemptsLeft = (existingParticipant.attemptsLeft || 0) + attemptsPerEntry;
      existingParticipant.transactions = existingParticipant.transactions || [];
      existingParticipant.transactions.push(transactionHash);
    } else {
      tournament.participants = tournament.participants || [];
      tournament.participants.push({
        address: userAddress.toLowerCase(),
        attemptsLeft: attemptsPerEntry,
        transactions: [transactionHash]
      });
    }

    await tournament.save();
    res.status(200).json({ 
      attemptsLeft: existingParticipant ? existingParticipant.attemptsLeft : attemptsPerEntry 
    });

  } catch (error) {
    console.error('Error entering tournament:', error);
    res.status(500).json({ error: 'Failed to enter tournament' });
  }
} 