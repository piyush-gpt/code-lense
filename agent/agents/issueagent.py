import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from pydantic import BaseModel, Field
from typing import TypedDict, Any, Optional, List
from dotenv import load_dotenv

    


   load_dotenv()


llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)

class IssueInput(BaseModel):
    issue_title: str
    issue_body: str

class IssueAnalysis(BaseModel):
    summary: str = Field(description="A concise summary of the issue")
    type: str = Field(description="The type of issue: bug, feature, enhancement, question, or danger")
    priority: str = Field(description="Priority level: high, medium, or low")
    suggested_actions: str = Field(description="Specific actions to take to address this issue")
    related_areas: str = Field(description="Areas of the codebase that might be affected")
    estimated_effort: str = Field(description="Estimated time/effort to resolve this issue")
    labels: str = Field(description="Comma-separated list of relevant labels (bug, feature, enhancement, question, danger)")

# --- AGENT STATE ---
class IssueAnalysisState(TypedDict):
    issue_title: str
    issue_body: str
    analysis: Optional[IssueAnalysis]

# --- GRAPH NODES ---
def analyze_issue(state: IssueAnalysisState):
    """Analyze the issue and generate comprehensive analysis."""
    
    # Create structured output LLM
    structured_llm = llm.with_structured_output(IssueAnalysis)
    
    prompt = f"""Analyze this GitHub issue and provide a comprehensive analysis.

Issue Title: {state['issue_title']}
Issue Description: {state['issue_body']}

Please analyze this issue and provide:
1. A clear summary of what the issue is about
2. Determine the type: bug (if the issue is about a bug in the repository code), feature (if issue is about adding a new functionality), enhancement (improvement), question (if issue is asking or seeking information), or danger (if the issue is asking to do something that may break the code, affect privacy, or harm the repo)
3. Assess priority: high (critical/urgent), medium (important), or low (nice to have)
4. Suggest specific actions to address the issue
5. Identify related areas of the codebase that might be affected
6. Estimate the effort required to resolve this issue
7. Recommend appropriate labels

Focus on being practical and actionable.

For the labels field, provide a comma-separated list of relevant labels from: bug, feature, enhancement, question, danger.
For the type field, choose exactly one from: bug, feature, enhancement, question, danger.
For the priority field, choose exactly one from: high, medium, low."""

    try:
        analysis = structured_llm.invoke(prompt)
        state["analysis"] = analysis
        return state
    except Exception as e:
        print(f"Error analyzing issue: {e}")
        # Fallback analysis
        state["analysis"] = IssueAnalysis(
            summary="Unable to analyze issue due to error",
            type="question",
            priority="medium",
            suggested_actions="Please review this issue manually",
            related_areas="Unknown",
            estimated_effort="Unknown",
            labels="question"
        )
        return state



# --- LANGGRAPH WORKFLOW ---
def build_issue_agent_graph():
    graph = StateGraph(IssueAnalysisState)
    
    graph.add_node("analyze_issue", analyze_issue)
    
    graph.set_entry_point("analyze_issue")
    graph.add_edge("analyze_issue", END)
    
    return graph.compile()

# --- EXPORT ---
issue_agent_graph = build_issue_agent_graph()

def run_issue_agent(issue_title: str, issue_body: str):
    """Run the issue analysis agent."""
    
    state = IssueAnalysisState(
        issue_title=issue_title,
        issue_body=issue_body,
        analysis=None
    )
    
    result = issue_agent_graph.invoke(state)
    return result["analysis"] 
