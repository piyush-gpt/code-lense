from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel
import dotenv
from typing import List

dotenv.load_dotenv()


SUMMARY_SYSTEM_PROMPT = """You are an AI assistant that summarizes GitHub pull requests for engineering teams. 

Given a PR title, description, and the files that were changed, generate a comprehensive technical summary that includes:

1. What the PR accomplishes (based on title and description)
2. Key technical changes made (based on file changes)
3. Impact on the codebase

Keep the summary concise but informative (3-4 sentences). Focus on the most important changes and their purpose."""

RISK_SYSTEM_PROMPT = """You are a code reviewer. Classify the risk of a PR based on the number of lines changed, whether critical files are touched, and if tests were modified. 

Output format:
Risk Level: [Low/Medium/High]
Reason: [2-3 sentence explanation]"""

TEST_SUGGESTION_PROMPT = """You are a test engineer. Based on the PR diff and description, suggest 3-5 key test cases that should be written. Keep each test case brief and focused.

Format:
1. [Test case name] - [Brief description]
2. [Test case name] - [Brief description]
..."""

CHECKLIST_PROMPT = """Generate a concise technical PR review checklist based on the files changed and the PR content. Focus on the most critical items only.

Format:
- [ ] [Critical item to check]
- [ ] [Critical item to check]
..."""

AFFECTED_MODULES_PROMPT = """List the key modules or features affected by this PR based on filenames and diff content. Keep it concise with 2-4 bullet points."""

LABEL_SUGGESTION_PROMPT = """You are an AI assistant that suggests GitHub PR labels based on the PR's risk, test coverage, type, and content. Choose from: high-risk, medium-risk, low-risk, needs-tests, feature, bugfix, refactor, documentation, needs-review. Output a comma-separated list of the most relevant labels for this PR. Only include labels that are justified by the PR content."""


llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

class PRInput(BaseModel):
    pr_title: str
    pr_body: str
    changed_files: list

class AnalysisState(BaseModel):
    pr_title: str
    pr_body: str
    changed_files: list
    summary: str = ""
    risk: str = ""
    suggested_tests: str = ""
    checklist: str = ""
    affected_modules: str = ""
    labels: str = ""  # Comma-separated label names

class LabelSuggestionOutput(BaseModel):
    labels: List[str]

def summarize_pr_node(state):  # node function
    # Include changed files information for a more comprehensive summary
    files_info = "\n".join([f"- {f['filename']}: {f['patch'][:200]}..." for f in state.changed_files[:5]])  # Show first 5 files with truncated patches
    input_text = f"PR Title: {state.pr_title}\n\nPR Description: {state.pr_body}\n\nChanged Files:\n{files_info}"
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", SUMMARY_SYSTEM_PROMPT),
        ("user", "{input}")
    ])
    chain = prompt | llm | StrOutputParser()
    return {"summary": chain.invoke({"input": input_text})}

def estimate_risk_node(state):
    files_text = "\n".join([f"{f['filename']}: {f['patch']}" for f in state.changed_files])
    input_text = f"PR Title: {state.pr_title}\n\nPR Description: {state.pr_body}\n\nChanged Files:\n{files_text}"
    prompt = ChatPromptTemplate.from_messages([
        ("system", RISK_SYSTEM_PROMPT),
        ("user", "{input}")
    ])
    chain = prompt | llm | StrOutputParser()
    return {"risk": chain.invoke({"input": input_text})}

def suggest_tests_node(state):
    combined = f"PR Title: {state.pr_title}\n\nPR Description: {state.pr_body}\n\nChanged Files:\n" + "\n".join([f"{f['filename']}: {f['patch']}" for f in state.changed_files])
    prompt = ChatPromptTemplate.from_messages([
        ("system", TEST_SUGGESTION_PROMPT),
        ("user", "{input}")
    ])
    chain = prompt | llm | StrOutputParser()
    return {"suggested_tests": chain.invoke({"input": combined})}

def generate_checklist_node(state):
    input_text = f"PR Title: {state.pr_title}\n\nPR Description: {state.pr_body}\n\nChanged Files:\n" + "\n".join([f"{f['filename']}: {f['patch']}" for f in state.changed_files])
    prompt = ChatPromptTemplate.from_messages([
        ("system", CHECKLIST_PROMPT),
        ("user", "{input}")
    ])
    chain = prompt | llm | StrOutputParser()
    return {"checklist": chain.invoke({"input": input_text})}

def modules_summary_node(state):
    files = ", ".join([f["filename"] for f in state.changed_files])
    prompt = ChatPromptTemplate.from_messages([
        ("system", AFFECTED_MODULES_PROMPT),
        ("user", "{input}")
    ])
    chain = prompt | llm | StrOutputParser()
    return {"affected_modules": chain.invoke({"input": files})}


def label_suggestion_node(state):
    # Use the already generated analysis fields to suggest labels
    input_text = f"PR Title: {state.pr_title}\n\nPR Description: {state.pr_body}\n\nRisk: {state.risk}\nSuggested Tests: {state.suggested_tests}\nChecklist: {state.checklist}\nChanged Files: {[f['filename'] for f in state.changed_files]}"
    prompt = ChatPromptTemplate.from_messages([
        ("system", LABEL_SUGGESTION_PROMPT),
        ("user", "{input}")
    ])
    # Use Gemini's structured output with Pydantic
    structured_llm = llm.with_structured_output(LabelSuggestionOutput)
    chain = prompt | structured_llm
    result = chain.invoke({"input": input_text})
    # Ensure result is a LabelSuggestionOutput instance
    if isinstance(result, dict):
        result = LabelSuggestionOutput(**result)
    labels = getattr(result, 'labels', None)
    if labels is None:
        raise ValueError("LLM did not return 'labels' in structured output")
    return {"labels": ", ".join(labels)}


def build_pr_agent_graph():
    builder = StateGraph(AnalysisState)
    
    builder.add_node("summarize_pr", summarize_pr_node)
    builder.add_node("estimate_risk", estimate_risk_node)
    builder.add_node("suggest_tests", suggest_tests_node)
    builder.add_node("generate_checklist", generate_checklist_node)
    builder.add_node("modules_summary", modules_summary_node)
    builder.add_node("label_suggestion", label_suggestion_node)

    builder.set_entry_point("summarize_pr")
    builder.add_edge("summarize_pr", "estimate_risk")
    builder.add_edge("estimate_risk", "suggest_tests")
    builder.add_edge("suggest_tests", "generate_checklist")
    builder.add_edge("generate_checklist", "modules_summary")
    builder.add_edge("modules_summary", "label_suggestion")
    builder.add_edge("label_suggestion", END)

    return builder.compile()
