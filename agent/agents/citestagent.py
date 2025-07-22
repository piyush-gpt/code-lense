from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel
import dotenv
from typing import Any, TypedDict

dotenv.load_dotenv()

FLAKY_CLASSIFIER_PROMPT = """You are an expert CI test log analyst. Given a CI job log, determine if the failure is likely due to a flaky test (i.e., intermittent, non-deterministic, or infrastructure-related) or a real, consistent bug. 

Output format (JSON):
{
  "is_flaky": true or false,
  "explanation": "1-2 sentences explaining your reasoning"
}
"""

llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

class CILogInput(TypedDict):
    log_text: str

class CILogAnalysis(BaseModel):
    is_flaky: bool
    explanation: str

def classify_flaky_node(state: CILogInput) -> dict[str, Any]:
    prompt = ChatPromptTemplate.from_messages([
        ("system", FLAKY_CLASSIFIER_PROMPT),
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
    builder.add_node("classify_flaky", classify_flaky_node)
    builder.set_entry_point("classify_flaky")
    builder.add_edge("classify_flaky", END)
    return builder.compile() 