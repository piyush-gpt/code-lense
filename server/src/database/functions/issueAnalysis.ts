import { IssueAnalysis } from "../../models/IssueAnalysis.ts";

export async function saveIssueAnalysis(data: {
  accountId: number;
  owner: string;
  repo: string;
  issueNumber: number;
  issueTitle: string;
  analysis: any;
  contentHash: string;
}) {
  try {
    const { accountId, owner, repo, issueNumber, issueTitle, analysis, contentHash } = data;
    
    const savedAnalysis = await IssueAnalysis.findOneAndUpdate(
      { accountId, owner, repo, issueNumber },
      {
        accountId,
        owner,
        repo,
        issueNumber,
        issueTitle,
        analysis,
        contentHash,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );
    
    console.log(`✅ Issue analysis saved for ${owner}/${repo}#${issueNumber}`);
    return savedAnalysis;
  } catch (error) {
    console.error("❌ Failed to save issue analysis:", error);
    throw error;
  }
}

export async function findIssueAnalysis(accountId: number, owner: string, repo: string, issueNumber: number) {
  try {
    const analysis = await IssueAnalysis.findOne({
      accountId,
      owner,
      repo,
      issueNumber,
    });
    return analysis;
  } catch (error) {
    console.error("❌ Failed to find issue analysis:", error);
    return null;
  }
}

export async function deleteIssueAnalysis(accountId: number, owner: string, repo: string, issueNumber: number) {
  try {
    await IssueAnalysis.findOneAndDelete({
      accountId,
      owner,
      repo,
      issueNumber,
    });
    console.log(`✅ Issue analysis deleted for ${owner}/${repo}#${issueNumber}`);
  } catch (error) {
    console.error("❌ Failed to delete issue analysis:", error);
    throw error;
  }
}

export async function updateIssueAnalysisCommentId(
  accountId: number,
  owner: string,
  repo: string,
  issueNumber: number,
  commentId: number | null
) {
  try {
    await IssueAnalysis.findOneAndUpdate(
      { accountId, owner, repo, issueNumber },
      { commentId, updatedAt: new Date() }
    );
    console.log(`✅ Updated comment ID for issue ${owner}/${repo}#${issueNumber}: ${commentId}`);
  } catch (error) {
    console.error("❌ Failed to update issue analysis comment ID:", error);
    throw error;
  }
} 

export async function deleteAllIssueAnalysesForAccount(accountId: number) {
  try {
    const result = await IssueAnalysis.deleteMany({ accountId });
    return result;
  } catch (error) {
    console.error("❌ Failed to delete all issue analyses for account:", error);
    throw error;
  }
} 