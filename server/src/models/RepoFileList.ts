import mongoose, { Schema, Document } from 'mongoose';

// Interface for TypeScript type safety
export interface IRepoFileList extends Document {
  accountId: string;      // User or installation ID
  repo: string;           // Repository name (e.g., "owner/repo")
  filepaths: string[];    // List of all file paths in the repo
  updatedAt: Date;        // Last update timestamp
}

const RepoFileListSchema: Schema = new Schema<IRepoFileList>({
  accountId: { type: String, required: true }, // User or installation ID
  repo:      { type: String, required: true }, // Repository name
  filepaths: { type: [String], required: true }, // List of file paths
  updatedAt: { type: Date, default: Date.now }, // Last update timestamp
});

export default mongoose.model<IRepoFileList>('RepoFileList', RepoFileListSchema); 