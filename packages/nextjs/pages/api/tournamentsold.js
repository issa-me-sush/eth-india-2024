import dbConnect from '@/lib/dbConnect';
import Tournament from '@/models/Tournament';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      const tournaments = await Tournament.find({ active: true });
      res.status(200).json(tournaments);
    } catch (error) {
      res.status(400).json({ error: 'Failed to fetch tournaments' });
    }
  } else if (req.method === 'POST') {
    try {
      const tournament = await Tournament.create(req.body);
      res.status(201).json(tournament);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create tournament' });
    }
  }
}