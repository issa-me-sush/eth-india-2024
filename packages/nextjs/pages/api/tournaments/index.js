import dbConnect from '@/lib/dbConnect';
import Tournament from '@/models/Tournament';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const tournaments = await Tournament.find({}).sort({ createdAt: -1 });
      console.log('Fetched tournaments:', tournaments.length);
      res.status(200).json(tournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      res.status(400).json({ error: 'Failed to fetch tournaments' });
    }
  } else if (req.method === 'POST') {
    try {
      const tournament = await Tournament.create(req.body);
      console.log('Created new tournament:', tournament._id);
      res.status(201).json(tournament);
    } catch (error) {
      console.error('Error creating tournament:', error);
      res.status(400).json({ error: 'Failed to create tournament' });
    }
  }
}