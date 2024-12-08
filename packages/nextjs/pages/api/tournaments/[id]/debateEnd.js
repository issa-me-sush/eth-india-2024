import dbConnect from '../../../../lib/dbConnect';
import Tournament from '../../../../models/Tournament';
import { Wallet } from '@coinbase/coinbase-sdk';
import { ethers } from 'ethers';
import { initializeCDP } from '../../../../utils/cdpConfig';
import StoredData from '../../../../models/StoredData';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize the Coinbase SDK
    initializeCDP();

    await dbConnect();
    const { id } = req.query;

    // Fetch the tournament
    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Ensure the tournament is in DEBATE_ARENA mode
    if (tournament.mode !== 'DEBATE_ARENA') {
      return res.status(400).json({ error: 'Invalid tournament mode for resolution' });
    }

    // Calculate winners based on messages and scoring logic
    const winners = await calculateDebateWinners(tournament.messages);

    // Determine the category of the debate
    const category = await determineDebateCategory(tournament.messages.join(' '));

    // Store data on Walrus
    const blobId = await storeDataOnWalrus(category, tournament.messages);
    if (blobId) {
      // Save the stored data information
      await StoredData.create({ category, blobId });
    }

    // Distribute prizes
    if (!tournament.prizesDistributed) {
      console.log('Distributing prizes for tournament:', tournament._id);

      // Calculate total prize pool from current participants
      const totalPrizePool = tournament.currentParticipants * tournament.entryFee;
      const prizePool = ethers.utils.parseEther(totalPrizePool.toString());
      const gasReserve = prizePool.mul(1).div(100); // 1% for gas
      const distributablePrize = prizePool.sub(gasReserve);

      let agentWallet;
      try {
        console.log('Wallet data:', tournament.walletData); // Debugging line
        agentWallet = await Wallet.import({
          walletId: tournament.walletData.walletId,
          seed: tournament.walletData.seed
        });
      } catch (importError) {
        console.error('Error importing wallet:', importError);
        return res.status(500).json({ error: 'Failed to import wallet' });
      }

      // Quadratic distribution logic
      const totalQuadraticWeight = (5 * (5 + 1) * (2 * 5 + 1)) / 6; // Sum of squares for top 5
      for (let i = 0; i < winners.length; i++) {
        const rank = i + 1;
        const quadraticWeight = (6 - rank) ** 2; // Quadratic weight for rank
        const prizeAmount = distributablePrize.mul(quadraticWeight).div(totalQuadraticWeight);

        const transfer = await agentWallet.createTransfer({
          amount: ethers.utils.formatEther(prizeAmount),
          assetId: "eth",
          destination: winners[i],
          gasless: false
        });

        const result = await transfer.wait();
        console.log('Transfer completed:', result);

        // Update tournament with winner info
        tournament.winners.push({
          address: winners[i],
          rank: rank,
          prize: Number(ethers.utils.formatEther(prizeAmount))
        });
      }

      // Mark as completed
      tournament.prizesDistributed = true;
      tournament.status = 'COMPLETED';
      await tournament.save();
    }

    // Return the winners along with the success message
    res.status(200).json({ message: 'Debate resolved and prizes distributed', winners: tournament.winners });
  } catch (error) {
    console.error('Error resolving debate:', error);
    res.status(500).json({ error: 'Failed to resolve debate' });
  }
}

// Example function to calculate winners based on messages
async function calculateDebateWinners(messages) {
  const scores = {};

  for (const message of messages) {
    if (message.role === 'user') {
      const score = await calculateDebateScore(message.content);
      if (!scores[message.senderAddress]) {
        scores[message.senderAddress] = 0;
      }
      scores[message.senderAddress] += score;
    }
  }

  // Sort participants by score and select top winners
  const sortedParticipants = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const winners = sortedParticipants.slice(0, 5).map(([address]) => address);

  return winners;
}

// Helper function to calculate debate score using RedPill API
async function calculateDebateScore(messageContent) {
  try {
    const response = await fetch("https://api.red-pill.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REDPILL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "gpt-4o",
        "messages": [
          {
            "role": "system",
            "content": "You are an AI judge evaluating debate messages. Provide a score between 0 and 10 based on the quality of the argument."
          },
          {
            "role": "user",
            "content": messageContent
          }
        ]
      })
    });

    const data = await response.json();
    const score = parseFloat(data.choices[0].message.content);
    return isNaN(score) ? 0 : score; // Default to 0 if parsing fails
  } catch (error) {
    console.error('Error calculating debate score:', error);
    return 0; // Default to 0 on error
  }
}

async function determineDebateCategory(messageContent) {
  try {
    const response = await fetch("https://api.red-pill.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.REDPILL_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        "model": "gpt-4o",
        "messages": [
          {
            "role": "system",
            "content": "You are an AI judge categorizing debate messages. Choose a category from: gaming, tech, science, values, morality, health."
          },
          {
            "role": "user",
            "content": messageContent
          }
        ]
      })
    });

    const data = await response.json();
    const category = data.choices[0].message.content.trim();
    return category;
  } catch (error) {
    console.error('Error determining debate category:', error);
    return 'unknown'; // Default to 'unknown' on error
  }
}

async function storeDataOnWalrus(category, data) {
  const PUBLISHER = process.env.PUBLISHER_URL; // Set this in your environment variables

  try {
    const response = await fetch(`${PUBLISHER}/v1/store`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ category, data })
    });

    const result = await response.json();
    console.log('Store data on Walrus result:', result);
    return result.newlyCreated ? result.newlyCreated.blobObject.blobId : null;
  } catch (error) {
    console.error('Error storing data on Walrus:', error);
    return null;
  }
} 