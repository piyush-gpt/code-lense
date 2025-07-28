from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langchain.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field
import dotenv
from typing import Any, TypedDict, List, Optional

dotenv.load_dotenv()

REFACTOR_PROMPT = """You are an expert code reviewer and refactoring specialist. Given a pull request with changed files, analyze the code and suggest specific refactoring improvements.

Focus on:
1. Code quality improvements (DRY principle, better naming, etc.)
2. Performance optimizations
3. Security improvements
4. Readability enhancements
5. Best practices violations

For each suggestion, provide:
- File path
- Specific suggestion description
- Updated code snippet (if applicable)

If no meaningful refactoring is needed, return an empty list.

Analyze the PR title, body, and changed files to identify potential refactoring opportunities.
"""

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

class RefactorInput(BaseModel):
    pr_title: str
    pr_body: str
    changed_files: List[dict]
    final_analysis: Optional[dict] = None

class RefactorSuggestion(BaseModel):
    file_path: str = Field(description="The file path where the refactoring suggestion applies")
    suggestion: str = Field(description="A clear description of the refactoring suggestion")
    updated_code: str = Field(description="The updated code snippet showing the refactored version", default="")

class RefactorAnalysis(BaseModel):
    refactor_suggestions: List[RefactorSuggestion] = Field(description="List of refactoring suggestions for the PR", default=[])

def analyze_refactor_node(state: RefactorInput) -> dict[str, Any]:
    prompt = ChatPromptTemplate.from_messages([
        ("system", REFACTOR_PROMPT),
        ("user", "PR Title: {pr_title}\nPR Body: {pr_body}\nChanged Files: {changed_files}")
    ])
    
    structured_llm = llm.with_structured_output(RefactorAnalysis)
    chain = prompt | structured_llm
    result = chain.invoke({
        "pr_title": state.pr_title,
        "pr_body": state.pr_body,
        "changed_files": state.changed_files
    })
    return {
        "final_analysis": result.model_dump()
    }

def build_refactor_agent_graph():
    builder = StateGraph(RefactorInput)
    builder.add_node("analyze_refactor", analyze_refactor_node)
    builder.set_entry_point("analyze_refactor")
    builder.add_edge("analyze_refactor", END)
    return builder.compile() 