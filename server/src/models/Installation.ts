import mongoose from 'mongoose';

// Installation Schema
const installationSchema = new mongoose.Schema({
  installationId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  accountLogin: {
    type: String,
    required: true
  },
  accountId: {
    type: Number,
    required: true
  },
  accountType: {
    type: String,
    enum: ['User', 'Organization'],
    required: true
  },
  permissions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  repositories: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
installationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Installation = mongoose.model('Installation', installationSchema);
