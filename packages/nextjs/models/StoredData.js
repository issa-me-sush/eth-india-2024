import mongoose from 'mongoose';

const StoredDataSchema = new mongoose.Schema({
  category: String,
  blobId: String,
  attestationUID: String,
  attestedBy: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.StoredData || mongoose.model('StoredData', StoredDataSchema);