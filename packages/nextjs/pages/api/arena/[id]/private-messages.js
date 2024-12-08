import dbConnect from '../../../../lib/dbConnect';
import Tournament from '../../../../models/Tournament';
import Message from '../../../../models/Message';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await dbConnect();
    const { id } = req.query;
    const { userAddress } = req.query;

    if (!userAddress) {
      return res.status(400).json({ error: 'User address is required' });
    }

    const tournament = await Tournament.findById(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (tournament.mode !== 'TWENTY_QUESTIONS') {
      return res.status(400).json({ error: 'Invalid tournament mode for private messages' });
    }

    // Get only messages for this specific user
    const messages = await Message.find({
      tournamentId: id,
      $or: [
        { senderAddress: userAddress.toLowerCase() },
        { recipientAddress: userAddress.toLowerCase() }
      ]
    }).sort({ timestamp: 1 });

    res.status(200).json({ messages });
  } catch (error) {
    console.error('Error fetching private messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
} 