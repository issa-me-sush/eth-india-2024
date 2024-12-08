import { Wallet } from "@coinbase/coinbase-sdk";

const GAS_FEE_PERCENTAGE = 0.02; // 2% for gas fees

export const distributePrizes = async (tournament, winners) => {
  try {
    console.log(`Starting prize distribution for tournament ${tournament._id}`);
    console.log(`Number of winners: ${winners.length}`);

    // Early validation for winners array
    if (!winners || winners.length === 0) {
      console.error('No winners provided for distribution');
      throw new Error('No winners to distribute prizes to');
    }

    // Import the tournament's agent wallet
    const agentWallet = await Wallet.import(tournament.walletData);
    console.log(`Agent wallet loaded: ${await agentWallet.getDefaultAddress()}`);

    // Calculate total prize and gas fee reserve
    const totalPrize = tournament.currentParticipants * tournament.entryFee;
    const gasFeeReserve = totalPrize * GAS_FEE_PERCENTAGE;
    const distributablePrize = totalPrize - gasFeeReserve;

    console.log(`Total prize pool: ${totalPrize} ETH`);
    console.log(`Gas fee reserve (2%): ${gasFeeReserve} ETH`);
    console.log(`Distributable prize: ${distributablePrize} ETH`);

    // Handle single winner case for any mode
    if (winners.length === 1) {
      console.log('Single winner detected - distributing entire prize');
      const singleWinnerDistribution = [{
        address: winners[0],
        amount: distributablePrize
      }];
      console.log('Distribution for single winner:', singleWinnerDistribution);

      const transfer = await agentWallet.createTransfer({
        amount: distributablePrize,
        assetId: Coinbase.assets.Eth,
        destination: winners[0],
        gasless: false
      });
      
      const result = await transfer.wait();
      console.log(`Single winner transfer completed: ${result.hash}`);
      return [result];
    }

    // Multiple winners case
    let distributions;
    switch (tournament.mode) {
      case 'DEBATE_ARENA':
        distributions = getDebateDistribution(winners, distributablePrize);
        break;
      case 'TWENTY_QUESTIONS':
        distributions = getTwentyQuestionsDistribution(winners, distributablePrize);
        break;
      case 'AGENT_CHALLENGE':
        distributions = [{ address: winners[0], amount: distributablePrize }];
        break;
    }

    console.log('Prize distributions calculated:', distributions);

    // Execute transfers
    console.log('Starting transfers...');
    const transfers = await Promise.all(distributions.map(async ({ address, amount }) => {
      try {
        console.log(`Initiating transfer of ${amount} ETH to ${address}`);
        const transfer = await agentWallet.createTransfer({
          amount: amount,
          assetId: Coinbase.assets.Eth,
          destination: address,
          gasless: false
        });
        const result = await transfer.wait();
        console.log(`Transfer completed: ${result.hash}`);
        return result;
      } catch (error) {
        console.error(`Transfer failed to ${address}:`, error);
        throw error;
      }
    }));

    // Log remaining balance (gas fee reserve)
    const remainingBalance = await agentWallet.getBalance(Coinbase.assets.Eth);
    console.log(`Remaining wallet balance (gas fee reserve): ${remainingBalance} ETH`);

    return transfers;
  } catch (error) {
    console.error('Prize distribution error:', {
      tournamentId: tournament._id,
      error: error.message,
      stack: error.stack,
      winners,
      mode: tournament.mode
    });
    throw error;
  }
};

const getDebateDistribution = (winners, totalPrize) => {
  try {
    const numWinners = Math.min(winners.length, 5);
    console.log(`Calculating debate distribution for ${numWinners} winners`);

    if (numWinners === 1) {
      console.log('Single winner gets full prize');
      return [{ address: winners[0], amount: totalPrize }];
    }

    // Distribution percentages for debate mode
    const percentages = {
      5: [0.35, 0.25, 0.20, 0.12, 0.08],
      4: [0.40, 0.30, 0.20, 0.10],
      3: [0.50, 0.30, 0.20],
      2: [0.60, 0.40]
    };

    const distribution = winners.slice(0, numWinners).map((address, index) => ({
      address,
      amount: totalPrize * percentages[numWinners][index]
    }));

    console.log('Debate distribution calculated:', distribution);
    return distribution;
  } catch (error) {
    console.error('Error in debate distribution calculation:', error);
    throw error;
  }
};

const getTwentyQuestionsDistribution = (winners, totalPrize) => {
  try {
    const numWinners = Math.min(winners.length, 3);
    console.log(`Calculating 20Q distribution for ${numWinners} winners`);

    if (numWinners === 1) {
      console.log('Single winner gets full prize');
      return [{ address: winners[0], amount: totalPrize }];
    }

    // Distribution percentages for 20 questions mode
    const percentages = {
      3: [0.50, 0.30, 0.20],
      2: [0.60, 0.40]
    };

    const distribution = winners.slice(0, numWinners).map((address, index) => ({
      address,
      amount: totalPrize * percentages[numWinners][index]
    }));

    console.log('20Q distribution calculated:', distribution);
    return distribution;
  } catch (error) {
    console.error('Error in 20Q distribution calculation:', error);
    throw error;
  }
}; 