import { PRAnalysis } from '../../models/PRAnalysis.ts';

export interface PRAnalysisData {
  accountId: number;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  analysis: {
    summary: string;
    risk: string;
    suggested_tests: string;
    checklist: string;
    affected_modules: string;
    matched_issues: string;
  };
  commentId?: number;
  cicommentId?: number;
  contentHash?: string;
}

// Find existing analysis for a PR
export const findPRAnalysis = async (
  accountId: number,
  owner: string,
  repo: string,
  prNumber: number
) => {
  try {
    const analysis = await PRAnalysis.findOne({
      accountId,
      owner,
      repo,
      prNumber
    });
    return analysis;
  } catch (error) {
    console.error('Error finding PR analysis:', error);
    throw error;
  }
};

// Create or update PR analysis
export const savePRAnalysis = async (data: PRAnalysisData) => {
  try {
    const analysis = await PRAnalysis.findOneAndUpdate(
      {
        accountId: data.accountId,
        owner: data.owner,
        repo: data.repo,
        prNumber: data.prNumber
      },
      {
        ...data,
        updatedAt: new Date()
      },
      {
        upsert: true,
        new: true
      }
    );
    return analysis;
  } catch (error) {
    console.error('Error saving PR analysis:', error);
    throw error;
  }
};

// Update comment ID for a PR analysis
export const updatePRAnalysisCommentId = async (
  accountId: number,
  owner: string,
  repo: string,
  prNumber: number,
  commentId: number
) => {
  try {
    const analysis = await PRAnalysis.findOneAndUpdate(
      {
        accountId,
        owner,
        repo,
        prNumber
      },
      {
        commentId,
        updatedAt: new Date()
      },
      {
        new: true
      }
    );
    return analysis;
  } catch (error) {
    console.error('Error updating PR analysis comment ID:', error);
    throw error;
  }
};

// Update CI comment ID for a PR analysis
export const updatePRAnalysisCICommentId = async (
  accountId: number,
  owner: string,
  repo: string,
  prNumber: number,
  cicommentId: number | null
) => {
  try {
    const analysis = await PRAnalysis.findOneAndUpdate(
      {
        accountId,
        owner,
        repo,
        prNumber
      },
      {
        cicommentId,
        updatedAt: new Date()
      },
      {
        new: true
      }
    );
    return analysis;
  } catch (error) {
    console.error('Error updating PR analysis CI comment ID:', error);
    throw error;
  }
};

// Delete PR analysis
export const deletePRAnalysis = async (
  accountId: number,
  owner: string,
  repo: string,
  prNumber: number
) => {
  try {
    const result = await PRAnalysis.deleteOne({
      accountId,
      owner,
      repo,
      prNumber
    });
    return result;
  } catch (error) {
    console.error('Error deleting PR analysis:', error);
    throw error;
  }
};

// Get all analyses for a repository
export const getRepositoryAnalyses = async (
  accountId: number,
  owner: string,
  repo: string
) => {
  try {
    const analyses = await PRAnalysis.find({
      accountId,
      owner,
      repo
    }).sort({ updatedAt: -1 });
    return analyses;
  } catch (error) {
    console.error('Error getting repository analyses:', error);
    throw error;
  }
};

// Get all analyses for an account
export const getAllAnalysesForAccount = async (accountId: number) => {
  try {
    const analyses = await PRAnalysis.find({
      accountId
    }).sort({ updatedAt: -1 });
    return analyses;
  } catch (error) {
    console.error('Error getting all analyses for account:', error);
    throw error;
  }
};

// Delete all PR analyses for an account
export const deleteAllPRAnalysesForAccount = async (accountId: number) => {
  try {
    const result = await PRAnalysis.deleteMany({
      accountId
    });
    return result;
  } catch (error) {
    console.error('Error deleting all PR analyses for account:', error);
    throw error;
  }
}; 