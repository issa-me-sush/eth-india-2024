export const TOURNAMENT_MODES = {
  AGENT_CHALLENGE: {
    name: "Agent Challenge",
    description: "Challenge participants with AI-generated or custom conditions. Perfect for riddles, puzzles, or creative tasks!",
    winningCondition: "FIRST_SOLVE",
    prizeDistribution: "WINNER_TAKES_ALL",
    icon: "🎯",
    color: "purple",
    hasAutoOption: true,
    defaultInstructions: {
      auto: `You are an AI challenge master. Your task:
1. Generate an engaging, unique challenge (riddles, puzzles, creative tasks)
2. Present it clearly to participants
3. Evaluate responses strictly against your condition
4. Only mark success when the condition is perfectly met
5. Provide helpful feedback for incorrect attempts`,
      custom: `Define your own challenge and winning conditions. Examples:
1. Riddles with specific answers
2. Logic puzzles with clear solutions
3. Creative tasks with measurable completion criteria
4. Any challenge with definite win conditions`
    }
  },
  DEBATE_ARENA: {
    name: "Debate Arena",
    description: "Engage in intellectual discourse judged by AI personalities.",
    winningCondition: "JUDGE_SCORE",
    prizeDistribution: "QUADRATIC_SPLIT",
    icon: "⚖️",
    color: "cyan",
    hasAutoOption: false,
    defaultInstructions: `You are a debate judge evaluating responses based on:
1. Logical reasoning (40%)
2. Evidence presentation (30%)
3. Clarity of expression (30%)
Score each response and provide brief feedback.`
  },
  TWENTY_QUESTIONS: {
    name: "Twenty Questions",
    description: "Race to guess the secret through clever questioning. First 5 correct guesses win!",
    winningCondition: "QUICK_SOLVE",
    prizeDistribution: "TOP_FIVE_SPLIT",
    icon: "🔮",
    color: "green",
    hasAutoOption: false,
    defaultInstructions: `You are hosting a 20 questions game. Rules:
1. Only yes/no questions allowed
2. Track question count per user
3. Mark success on exact answer
4. First 5 correct answers win
5. Provide clear yes/no responses`
  }
};

export const PRIZE_DISTRIBUTIONS = {
  WINNER_TAKES_ALL: (totalPrize) => ({
    1: totalPrize
  }),
  QUADRATIC_SPLIT: (totalPrize) => {
    const weights = [4, 2, 1]; // Quadratic weights
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.reduce((acc, weight, index) => {
      acc[index + 1] = (weight / total) * totalPrize;
      return acc;
    }, {});
  },
  TOP_FIVE_SPLIT: (totalPrize) => {
    const weights = [5, 4, 3, 2, 1];
    const total = weights.reduce((a, b) => a + b, 0);
    return weights.reduce((acc, weight, index) => {
      acc[index + 1] = (weight / total) * totalPrize;
      return acc;
    }, {});
  }
}; 