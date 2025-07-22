import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript type safety
export interface ICodeChunk extends Document {
  accountId: string;      // User or installation ID
  repo: string;           // Repository name (e.g., "owner/repo")
  filepath: string;       // Path to the file in the repo
  chunkIndex: number;     // Index of the chunk within the file
  content: string;        // Code chunk text
  embedding: number[];    // Vector embedding (array of floats)
  createdAt: Date;        // Timestamp for TTL/cleanup
}

const CodeChunkSchema: Schema = new Schema<ICodeChunk>({
  accountId: { type: String, required: true }, // User or installation ID
  repo:      { type: String, required: true }, // Repository name
  filepath:  { type: String, required: true }, // File path in repo
  chunkIndex:{ type: Number, required: true }, // Chunk index in file
  content:   { type: String, required: true }, // Code chunk text
  embedding: { type: [Number], required: true }, // Vector embedding
  createdAt: { type: Date, default: Date.now }, // Timestamp for TTL/cleanup
});

// TTL index for automatic cleanup (set in MongoDB, not here)

export default mongoose.model<ICodeChunk>('CodeChunk', CodeChunkSchema); 