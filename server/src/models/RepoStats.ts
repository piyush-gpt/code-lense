import mongoose from 'mongoose';

const repoStatsSchema = new mongoose.Schema({
  accountId: {
    type: Number,
    required: true,
    index: true
  },
  repo: {
    type: String,
    required: true,
    index: true
  },
  prCycleTimeTotalMs: {
    type: Number,
    default: 0
  },
  prCycleTimeCount: {
    type: Number,
    default: 0
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

repoStatsSchema.index({ accountId: 1, repo: 1 }, { unique: true });

repoStatsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const RepoStats = mongoose.model('RepoStats', repoStatsSchema); 