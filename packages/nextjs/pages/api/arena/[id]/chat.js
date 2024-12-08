import dbConnect from '../../../../lib/dbConnect';
import Tournament from '../../../../models/Tournament';
import { Wallet } from '@coinbase/coinbase-sdk';
import { ethers } from 'ethers';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { id } = req.query;
    const { message, userAddress } = req.body;

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Verify participant
    const participant = tournament.participants?.find(
      p => p.address.toLowerCase() === userAddress.toLowerCase()
    );
    if (!participant || participant.attemptsLeft <= 0) {
      return res.status(403).json({ error: 'No attempts remaining' });
    }

    let aiResponse;
    let isSuccess = false;
    let shouldDistributePrizes = false;

    switch (tournament.mode) {
      case 'TWENTY_QUESTIONS':
        aiResponse = await handleTwentyQuestions(message, tournament.secretTerm);
        isSuccess = aiResponse.includes("Congratulations! You've correctly guessed");
        if (isSuccess) {
          participant.hasGuessedCorrect = true;
          participant.guessCount = (participant.guessCount || 0) + 1;
          shouldDistributePrizes = true;
        }
        break;

      case 'DEBATE_ARENA':
        aiResponse = await handleDebateResponse(message, tournament.debateTopic);
        // Add debate-specific win condition
        break;

      case 'AGENT_CHALLENGE':
        aiResponse = await handleAgentChallenge(message, tournament.challengeStatement);
        isSuccess = aiResponse.includes("Challenge completed successfully");
        if (isSuccess) {
          participant.hasCompleted = true;
          shouldDistributePrizes = true;
        }
        break;
    }

    // Add messages to tournament
    tournament.messages = tournament.messages || [];
    tournament.messages.push({
      role: 'user',
      content: message,
      senderAddress: userAddress.toLowerCase(),
      recipientAddress: tournament.treasuryAddress,
      timestamp: new Date()
    });
    tournament.messages.push({
      role: 'assistant',
      content: aiResponse,
      senderAddress: tournament.treasuryAddress,
      recipientAddress: userAddress.toLowerCase(),
      timestamp: new Date()
    });

    try {
      await tournament.save();
      console.log('Message stored successfully');
    } catch (saveError) {
      console.error('Error saving tournament:', saveError);
      return res.status(500).json({ error: 'Failed to store message' });
    }

    // Update participant attempts if needed
    if (isSuccess || tournament.mode === 'TWENTY_QUESTIONS') {
      participant.attemptsLeft -= 1;
    }

    // If we have a winner, distribute prizes
    if (shouldDistributePrizes && !tournament.prizesDistributed) {
      try {
        console.log('Distributing prizes for tournament:', tournament._id);
        const winners = [participant.address]; // For now, just the current winner
        
        // Calculate total prize pool from current participants
        const totalPrizePool = tournament.currentParticipants * tournament.entryFee;
        const prizePool = ethers.utils.parseEther(totalPrizePool.toString());
        const gasReserve = prizePool.mul(1).div(100); // 1% for gas
        const distributablePrize = prizePool.sub(gasReserve);
        
        let prizeAmount = distributablePrize;
        let rank = 1;

        // Determine rank and prize amount based on mode
        switch (tournament.mode) {
          case 'DEBATE_ARENA':
            rank = tournament.winners?.length + 1 || 1;
            if (rank <= 5) { // Top 5 get prizes
              const percentages = [35, 25, 20, 12, 8];
              prizeAmount = distributablePrize.mul(percentages[rank - 1]).div(100);
            }
            break;
          
          case 'TWENTY_QUESTIONS':
            rank = tournament.winners?.length + 1 || 1;
            if (rank <= 3) { // Top 3 get prizes
              const percentages = [50, 30, 20];
              prizeAmount = distributablePrize.mul(percentages[rank - 1]).div(100);
            }
            break;
          
          case 'AGENT_CHALLENGE':
            // Winner takes all
            rank = 1;
            break;
        }

        const agentWallet = await Wallet.import(tournament.walletData);
        const transfer = await agentWallet.createTransfer({
          amount: ethers.utils.formatEther(prizeAmount),
          assetId: "eth",
          destination: winners[0],
          gasless: false
        });

        const result = await transfer.wait();
        console.log('Transfer completed:', result);

        // Update tournament with winner info
        tournament.winners.push({
          address: winners[0],
          rank: rank,
          prize: Number(ethers.utils.formatEther(prizeAmount))
        });
        
        // Only mark as completed if this was the last winner
        if ((tournament.mode === 'DEBATE_ARENA' && rank === 5) ||
            (tournament.mode === 'TWENTY_QUESTIONS' && rank === 3) ||
            (tournament.mode === 'AGENT_CHALLENGE')) {
          tournament.prizesDistributed = true;
          tournament.status = 'COMPLETED';
        }
        
        await tournament.save();
        
        // Send response with prize info
        return res.status(200).json({
          message: aiResponse,
          success: isSuccess,
          attemptsLeft: participant.attemptsLeft,
          prizeDistributed: {
            amount: ethers.utils.formatEther(prizeAmount),
            txHash: result.transaction?.transaction_hash || result.transaction_hash
          }
        });

      } catch (error) {
        console.error('Prize distribution error:', error);
      }
    }

    // Always send a response even if prize distribution fails
    return res.status(200).json({
      message: aiResponse,
      success: isSuccess,
      attemptsLeft: participant.attemptsLeft
    });

  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}

// Helper function to calculate debate score based on AI response
function calculateDebateScore(message, aiResponse) {
  // Implement scoring logic based on AI response
  // For example, look for keywords like "excellent point", "strong argument", etc.
  let score = 0;
  if (aiResponse.includes('excellent point')) score += 3;
  if (aiResponse.includes('strong argument')) score += 2;
  if (aiResponse.includes('valid point')) score += 1;
  return score;
}

// Helper functions for different modes
async function handleTwentyQuestions(question, secretTerm) {
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
          "content": `You are hosting a 20 questions game. The secret term is "${secretTerm}". 
            Only answer with "Yes", "No", or "I cannot answer that". 
            If the user guesses the exact term, respond with "Congratulations! You've correctly guessed the term!"`
        },
        {
          "role": "user",
          "content": question
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function handleDebateResponse(message, topic) {
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
          "content": `You are an AI judge in a debate about "${topic}". 
            The bot is arguing "for" the topic, and the users are arguing "against". 
            Evaluate arguments for clarity, logic, and evidence. 
            Provide constructive feedback and encourage high-quality discussion.`
        },
        {
          "role": "user",
          "content": message
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function handleAgentChallenge(message, challenge) {
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
          "content": `You are evaluating solutions for this challenge: "${challenge}". 
            Provide helpful feedback. If the solution is correct, include the phrase 
            "Challenge completed successfully" in your response.`
        },
        {
          "role": "user",
          "content": message
        }
      ]
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
} 