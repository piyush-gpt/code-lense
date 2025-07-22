import mongoose, { Schema, Document } from "mongoose";

export interface IIssueAnalysis extends Document {
  accountId: number;
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  analysis: any;
  contentHash: string;
  commentId?: number;
  updatedAt: Date;
}

const IssueAnalysisSchema = new Schema<IIssueAnalysis>({
  accountId: { type: Number, required: true },
  owner: { type: String, required: true },
  repo: { type: String, required: true },
  issueNumber: { type: Number, required: true },
  issueTitle: { type: String, required: true },
  analysis: { type: Schema.Types.Mixed, required: true },
  contentHash: { type: String, required: true },
  commentId: { type: Number },
  updatedAt: { type: Date, default: Date.now },
});

// Create compound index for efficient queries
IssueAnalysisSchema.index({ accountId: 1, owner: 1, repo: 1, issueNumber: 1 }, { unique: true });

export const IssueAnalysis = mongoose.model<IIssueAnalysis>("IssueAnalysis", IssueAnalysisSchema); 