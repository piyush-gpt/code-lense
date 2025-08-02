import os
import time
from pymongo import MongoClient
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_voyageai import VoyageAIEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langgraph.graph import StateGraph, END
from githubkit import GitHub, AppInstallationAuthStrategy
from dotenv import load_dotenv
from typing import TypedDict, Any, Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
load_dotenv()
import base64

# --- CONFIGURATION ---
MONGODB_URI = os.environ.get("MONGODB_URI")
DB_NAME = "code-lense"
FILELIST_COLL = "repofilelists"
VECTOR_COLL = "codechunk"

# GitHub App credentials
APP_ID = os.environ.get("GITHUB_APP_ID")
PRIVATE_KEY = os.environ.get("GITHUB_PRIVATE_KEY") or ""

# --- LANGCHAIN SETUP ---
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
embeddings = VoyageAIEmbeddings(model="voyage-code-2")
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

# --- PYDANTIC MODELS ---
class FileSelection(BaseModel):
    """Structured output for file selection based on user query."""
    selected_files: List[str] = Field(
        description="List of file paths that are most likely to contain the answer to the user's query"
    )

# --- MONGODB SETUP ---
mongo = MongoClient(MONGODB_URI)
filelist_coll = mongo[DB_NAME][FILELIST_COLL]
vector_coll = mongo[DB_NAME][VECTOR_COLL]

# --- GITHUBKIT SETUP ---
def get_github_client(installation_id):
    app = GitHub(
        AppInstallationAuthStrategy(
            APP_ID, PRIVATE_KEY, installation_id,
        )
    )
    return app

# --- AGENT STATE ---
class CodeQueryState(TypedDict):
    user_query: str
    account_id: str
    repo: str
    owner: str
    installation_id: int
    filepaths: list[str]
    top_files: list[str]
    file_contents: dict[str, str]
    chunks: list[Any]
    embedded_chunks: list[Any]
    user_query_emb: Any
    relevant_chunks: list[Any]
    answer: Optional[str]

# --- GRAPH NODES ---
def fetch_file_list(state: CodeQueryState):
    doc = filelist_coll.find_one({"accountId": state["account_id"], "repo": state["repo"]})
    state["filepaths"] = doc["filepaths"] if doc else []
    return state

def select_top_files(state: CodeQueryState, top_n=3):
    # Create structured output LLM
    structured_llm = llm.with_structured_output(FileSelection)
    
    prompt = f"""User query: {state["user_query"]}

Here is a list of files in the repository:
{chr(10).join(f"- {fp}" for fp in state["filepaths"])}

Select the {top_n} file paths that are most likely to contain the answer to the user's query. 
Consider file extensions, naming patterns, and the nature of the query when making your selection.
Only return files that actually exist in the provided list with the same full name and path."""
    
    try:
        # Use structured output to get reliable file selection
        result = structured_llm.invoke(prompt)
        state["top_files"] = result.selected_files[:top_n]
        
        # Fallback: if structured output fails or returns invalid files, use first N
        if not state["top_files"] or not all(fp in state["filepaths"] for fp in state["top_files"]):
            state["top_files"] = state["filepaths"][:top_n]
            
    except Exception as e:
        # Fallback to simple selection if structured output fails
        state["top_files"] = state["filepaths"][:top_n]
    print(f"Top files: {state['top_files']}")
    return state

def fetch_files_content(state: CodeQueryState):
    client = get_github_client(state["installation_id"])
    file_contents = {}
    for filepath in state["top_files"]:
        try:
            resp = client.rest.repos.get_content(
                owner=state["owner"],
                repo=state["repo"].split('/')[-1],
                path=filepath
            ).parsed_data
            
            if not isinstance(resp, list) and resp.type == "file" and resp.content:
                content = base64.b64decode(resp.content).decode('utf-8')
                file_contents[filepath] = content
            else:
                print(f"⚠️ Path '{filepath}' is not a file or has no content, skipping.")
        except Exception as e:
            print(f"❌ Could not fetch content for '{filepath}': {e}")
            
    state["file_contents"] = file_contents
    print(f"File contents: {list(state['file_contents'].keys())}")
    return state

def chunk_and_embed(state: CodeQueryState):
    print(f"Chunking and embedding for {state['account_id']} {state['repo']}")
    all_chunks = []
    try: 
        for filepath, content in state["file_contents"].items():
            chunks = text_splitter.split_text(content)
            for i, chunk in enumerate(chunks):
                all_chunks.append({
                    "accountId": state["account_id"],
                    "repo": state["repo"],
                    "filepath": filepath,
                    "chunkIndex": i,
                    "content": chunk,
                    "createdAt": datetime.utcnow()
                })
    except Exception as e:
        print(f"❌ Error chunking and embedding: {e}")
        return state
    # Embed all chunks
    texts = [c["content"] for c in all_chunks]
    embeds = embeddings.embed_documents(texts)
    for c, e in zip(all_chunks, embeds):
        c["embedding"] = e
    # Store in MongoDB
    if all_chunks:
        print("all chunks")
        vector_coll.insert_many(all_chunks)
        print("⏳ Polling for vector index availability...")
        max_retries = 8 
        retries = 0
        
        while retries < max_retries:
            try:
                test_pipeline = [
                    {
                        "$vectorSearch": {
                            "index": "vector_index",
                            "queryVector": embeds[0] if embeds else [0.0] * 1536, 
                            "path": "embedding",
                            "numCandidates": 1,
                            "limit": 1,
                            "filter": {
                                "accountId": state["account_id"],
                                "repo": state["repo"]
                            }
                        }
                    }
                ]
                test_results = list(vector_coll.aggregate(test_pipeline))
                if test_results:
                    print(f"✅ Vector index ready after {retries * 2} seconds")
                    break
                else:
                    print(f"⏳ Vector index not ready, retrying in 2s... (attempt {retries + 1}/{max_retries})")
                    time.sleep(2)
                    retries += 1
            except Exception as e:
                print(f"⏳ Vector search error, retrying in 2s... (attempt {retries + 1}/{max_retries}): {e}")
                time.sleep(2)
                retries += 1
        
        if retries >= max_retries:
            print("⚠️ Vector index polling timed out after 15 seconds, proceeding anyway")
    
    state["embedded_chunks"] = all_chunks
    print(f"Embedded chunks: {len(state['embedded_chunks'])}")
    return state

def embed_user_query(state: CodeQueryState):
    print(f"Embedding user query for {state['account_id']} {state['repo']}")
    try:
        state["user_query_emb"] = embeddings.embed_query(state["user_query"])
    except Exception as e:
        print(f"❌ Error embedding user query: {e}")
        return state
    return state

def vector_search(state: CodeQueryState, top_k=5):
    print(f"Vector searching for {state['account_id']} {state['repo']}")
    print("here inside vector search")
    try:
        pipeline = [
            {
                "$vectorSearch": {
                    "index": "vector_index",
                    "queryVector": state["user_query_emb"],
                    "path": "embedding",
                    "numCandidates": 100,
                    "limit": top_k,
                    "filter": {
                        "accountId": state["account_id"],
                        "repo": state["repo"],
                            "filepath": { "$in": state["top_files"] }
                    }
                }
            }
        ]
        try:
            results = list(vector_coll.aggregate(pipeline))
            print(f"Vector search results: {len(results)} chunks found")
            state["relevant_chunks"] = results
        except Exception as e:
            print(f"❌ Vector search failed: {e}")
            # Fallback: get chunks without vector search
            fallback_results = list(vector_coll.find({
                "accountId": state["account_id"],
                "repo": state["repo"],
                "filepath": { "$in": state["top_files"] }
            }).limit(top_k))
            print(f"Fallback results: {len(fallback_results)} chunks")
            state["relevant_chunks"] = fallback_results
    except Exception as e:
        print(f"❌ Vector search failed: {e}")
        # Fallback: get chunks without vector search
        

    print(f"Relevant chunks: {len(state['relevant_chunks'])}")
    return state
def answer_with_llm(state: CodeQueryState):
    print(f"Answering with LLM for {state['account_id']} {state['repo']}")
    # Build context with file paths
    context_parts = []
    
    # Debug: Show which files the chunks came from
    file_counts = {}
    for chunk in state["relevant_chunks"]:
        filepath = chunk.get("filepath", "unknown")
        file_counts[filepath] = file_counts.get(filepath, 0) + 1
    print(f"Chunks per file: {file_counts}")
    
    for chunk in state["relevant_chunks"]:
        filepath = chunk.get("filepath", "unknown")
        content = chunk["content"]
        context_parts.append(f"File: {filepath}\n{content}")
    
    context = "\n\n".join(context_parts)
    prompt = f"User query: {state["user_query"]}\nRelevant code:\n{context}\n\nAnswer the user's question using the code above. When referencing code, mention the file path. keep the answer concise and not too long"
    response = llm.invoke(prompt)
    state["answer"] = str(response.content) if hasattr(response, 'content') else str(response)
    print(f"Answer: {state['answer']}")
    return state

# --- LANGGRAPH WORKFLOW ---
graph = StateGraph(CodeQueryState)
graph.add_node("fetch_file_list", fetch_file_list)
graph.add_node("select_top_files", select_top_files)
graph.add_node("fetch_files_content", fetch_files_content)
graph.add_node("chunk_and_embed", chunk_and_embed)
graph.add_node("embed_user_query", embed_user_query)
graph.add_node("vector_search", vector_search)
graph.add_node("answer_with_llm", answer_with_llm)

graph.set_entry_point("fetch_file_list")
graph.add_edge("fetch_file_list", "select_top_files")
graph.add_edge("select_top_files", "fetch_files_content")
graph.add_edge("fetch_files_content", "chunk_and_embed")
graph.add_edge("chunk_and_embed", "embed_user_query")
graph.add_edge("embed_user_query", "vector_search")
graph.add_edge("vector_search", "answer_with_llm")
graph.add_edge("answer_with_llm", END)

code_query_workflow = graph.compile()

def run_agent(user_query, account_id, repo, owner, installation_id):
    state: CodeQueryState = {
        "user_query": user_query,
        "account_id": account_id,
        "repo": repo,
        "owner": owner,
        "installation_id": installation_id,
        "filepaths": [],
        "top_files": [],
        "file_contents": {},
        "chunks": [],
        "embedded_chunks": [],
        "user_query_emb": None,
        "relevant_chunks": [],
        "answer": None,
    }
    final_state = code_query_workflow.invoke(state)
    return final_state["answer"]