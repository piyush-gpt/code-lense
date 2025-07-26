import mongoose from 'mongoose';

// PR Analysis Schema
const prAnalysisSchema = new mongoose.Schema({
  accountId: {
    type: Number,
    required: true,
    index: true
  },
  owner: {
    type: String,
    required: true
  },
  repo: {
    type: String,
    required: true
  },
  prNumber: {
    type: Number,
    required: true
  },
  prTitle: {
    type: String,
    required: true
  },
  analysis: {
    summary: String,
    risk: String,
    suggested_tests: String,
    checklist: String,
    affected_modules: String,
  },
  commentId: {
    type: Number,
    default: null
  },
  cicommentId: {
    type: Number,
    default: null
  },      
  ciTestResults: {
    type: Map,
    of: new mongoose.Schema({
      comment: String,
      updatedAt: Date,
      workflow: String
    }, { _id: false }),
    default: {}
  },
  contentHash: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create a compound index for efficient lookups
prAnalysisSchema.index({ accountId: 1, owner: 1, repo: 1, prNumber: 1 }, { unique: true });

// Update the updatedAt field on save
prAnalysisSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const PRAnalysis = mongoose.model('PRAnalysis', prAnalysisSchema); 