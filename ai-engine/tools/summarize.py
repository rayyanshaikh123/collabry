"""
Summarize Notes Tool - Generate comprehensive summaries.

This tool creates structured summaries of study materials
from a user's notebook.
"""

from typing import Optional
from langchain_core.tools import tool
from rag.retriever import get_retriever
from core.llm import get_async_openai_client, get_llm_config


@tool
async def summarize_notes(
    topic: str = "all notes",
    notebook_id: Optional[str] = None,
    user_id: str = "default"
) -> str:
    """
    Generate a comprehensive summary of notes in a notebook.
    
    Use this tool when the user asks for a summary of their study materials.
    
    Examples of when to use:
    - "Summarize my biology notes"
    - "Give me a summary of what I've learned"
    - "Create a study summary"
    
    Args:
        topic: Specific topic to focus on or "all notes" for everything
        notebook_id: Target notebook to summarize (optional, auto-injected)
        user_id: User identifier (optional, auto-injected)
    
    Returns:
        Structured summary with key topics and concepts
    """
    try:
        query = topic if topic else "main topics and key concepts"

        # First: scoped to the notebook (preferred)
        retriever = get_retriever(user_id=user_id, notebook_id=notebook_id, k=20)
        docs = retriever.invoke(query)

        # Fallback: user-wide (handles notebook/session id mismatches)
        if not docs:
            retriever = get_retriever(user_id=user_id, notebook_id=None, k=20)
            docs = retriever.invoke(query)

        if not docs:
            return "No documents found. Please upload some study materials first."
        
        # Combine document content
        combined_text = "\n\n".join([doc.page_content for doc in docs])
        
        # Generate summary using LLM
        client = get_async_openai_client()
        config = get_llm_config()
        
        system_prompt = """You are a study assistant creating a comprehensive summary.
        
Generate a well-structured summary with:
1. Main Topics - key subjects covered
2. Key Concepts - important ideas and definitions
3. Important Details - facts, dates, examples
4. Study Tips - suggested focus areas

Format in clear sections with bullet points."""
        
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Summarize these study materials:\n\n{combined_text[:8000]}"}  # Limit context
        ]
        
        response = await client.chat.completions.create(
            model=config.model,
            messages=messages,
            temperature=0.3,
            max_tokens=1500
        )
        
        summary = response.choices[0].message.content
        
        return f"# Summary of {notebook_id or 'Your Notes'}\n\n{summary}"
    
    except Exception as e:
        return f"Error generating summary: {str(e)}"
