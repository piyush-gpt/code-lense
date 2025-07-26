from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.pragent import build_pr_agent_graph, PRInput, AnalysisState
from agents.citestagent import build_citest_agent_graph, CILogInput, CILogAnalysis
from agents.codequeryagent import run_agent
from agents.issueagent import run_issue_agent, IssueInput
import time
from collections import defaultdict
from typing import Dict, List

app = FastAPI()
graph = build_pr_agent_graph()
citest_graph = build_citest_agent_graph()

# Rate limiting storage
rate_limit_store: Dict[str, List[float]] = defaultdict(list)
RATE_LIMIT_REQUESTS = 2  # 2 requests
RATE_LIMIT_WINDOW = 60   # per minute (60 seconds)

def check_rate_limit(account_id: str) -> bool:
    """
    Check if the account_id has exceeded the rate limit.
    Returns True if request is allowed, False if rate limited.
    """
    current_time = time.time()
    
    # Clean old entries (older than 1 minute)
    rate_limit_store[account_id] = [
        timestamp for timestamp in rate_limit_store[account_id]
        if current_time - timestamp < RATE_LIMIT_WINDOW
    ]
    
    # Check if we're under the limit
    if len(rate_limit_store[account_id]) < RATE_LIMIT_REQUESTS:
        rate_limit_store[account_id].append(current_time)
        return True
    
    return False

# Enable CORS for local dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeQueryInput(BaseModel):
    user_query: str
    account_id: str
    repo: str
    owner: str
    installation_id: int

@app.post("/analyze-issue")
async def analyze_issue(issue: IssueInput):
    try:
        analysis = run_issue_agent(
            issue_title=issue.issue_title,
            issue_body=issue.issue_body
        )
        return analysis
    except Exception as e:
        return {"error": str(e)}

@app.post("/analyze-pr")
async def analyze_pr(pr: PRInput):
    try:
        state = AnalysisState(
            pr_title=pr.pr_title,
            pr_body=pr.pr_body,
            changed_files=pr.changed_files,
        )
        result = graph.invoke(state)
        return result
    except Exception as e:
        return {"error": str(e)}

@app.post("/analyze-refactor")
async def analyze_refactor(pr: RefactorInput):
    try:
        result = refactor_graph.invoke(pr)
        return RefactorAnalysis(**result)
    except Exception as e:
        return {"error": str(e)}


@app.post("/classify-ci-log")
async def classify_ci_log(log: CILogInput):
    try:
        result = citest_graph.invoke(log)
        return CILogAnalysis(**result)
    except Exception as e:
        return {"error": str(e)}

@app.post("/code-query")
async def code_query(query: CodeQueryInput):
    # Check rate limit
    if not check_rate_limit(query.account_id):
        raise HTTPException(
            status_code=429, 
            detail=f"Rate limit exceeded. Only {RATE_LIMIT_REQUESTS} requests per minute allowed for account {query.account_id}"
        )
    
    try:
        answer = run_agent(
            user_query=query.user_query,
            account_id=query.account_id,
            repo=query.repo,
            owner=query.owner,
            installation_id=query.installation_id
        )
        return {"answer": answer}
    except Exception as e:
        return {"error": str(e)}
