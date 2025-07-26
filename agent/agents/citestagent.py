from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel
import dotenv
from typing import Any, TypedDict

dotenv.load_dotenv()

EXPLANATION_PROMPT = """You are an expert CI test log analyst. Given a CI job log, provide a concise 1-2 sentence explanation of why the job failed. Do not classify as flaky or not, just explain the failure.

Output format (JSON):
{
  "explanation": "1-2 sentences explaining the failure"
}
"""

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

class CILogInput(TypedDict):
    log_text: str

class CILogAnalysis(BaseModel):
    explanation: str

def explain_failure_node(state: CILogInput) -> dict[str, Any]:
    prompt = ChatPromptTemplate.from_messages([
        ("system", EXPLANATION_PROMPT),
        ("user", "{input}")
    ])
    structured_llm = llm.with_structured_output(CILogAnalysis)
    chain = prompt | structured_llm
    result = chain.invoke({"input": state["log_text"]})
    if isinstance(result, dict):
        result = CILogAnalysis(**result)
    return result.model_dump()

def build_citest_agent_graph():
    builder = StateGraph(CILogInput)
    builder.add_node("explain_failure", explain_failure_node)
    builder.set_entry_point("explain_failure")
    builder.add_edge("explain_failure", END)
    return builder.compile() 