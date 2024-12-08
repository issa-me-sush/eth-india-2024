import mongoose from 'mongoose';

const StoredDataSchema = new mongoose.Schema({
  category: { type: String, required: true },
  blobId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.StoredData || mongoose.model('StoredData', StoredDataSchema);