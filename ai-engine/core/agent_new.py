"""
Study Assistant Agent - LangChain agent with native tool calling.

This is the main agent that orchestrates LLM reasoning and tool execution.
Uses LangChain's create_openai_tools_agent for native function calling.

NO manual intent classification.
NO JSON parsing.
NO custom routing.

The LLM decides everything via tool calling.
"""

from typing import AsyncGenerator, Optional, Dict, Any, List
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from core.llm import get_langchain_llm
from core.conversation import get_conversation_manager
from core.artifact_templates import (
    detect_artifact_type,
    format_quiz_prompt,
    format_mindmap_prompt,
    format_flashcards_prompt,
    format_course_finder_prompt,
    format_reports_prompt,
    format_infographic_prompt,
    format_study_plan_prompt,
    format_practice_problems_prompt,
    format_summary_prompt,
    format_concept_map_prompt,
    post_process_course_output,
)
import json
import re


# System prompt for the study assistant
STUDY_ASSISTANT_PROMPT = """You are an intelligent study assistant helping students learn effectively.

CRITICAL INSTRUCTION FOR OUTPUT:
- Output ONLY user-facing content directly
- Do NOT wrap responses in JSON objects
- Do NOT include metadata structures
- Stream clean markdown text that users can read
- When a format is specified, follow it EXACTLY character-by-character

When generating artifacts (quizzes, courses, flashcards, etc.):
- Follow the EXACT format specified in the user's request
- If examples are provided, match them precisely
- Output the artifact content directly (no JSON wrapping)
- Use proper markdown formatting (bold, links, etc.)

Example - Course List (MUST use this exact format):

**[Python for Beginners](https://www.coursera.org/python-beginners)**  
Platform: Coursera | Rating: 4.8/5 | Price: Free

**[Complete Python Bootcamp](https://www.udemy.com/python-bootcamp)**  
Platform: Udemy | Rating: 4.7/5 | Price: $49

Example - Quiz (MUST use this exact format):

Question 1: What is an array?
A) A data structure
B) A function
C) A variable
D) A loop
Answer: A
Explanation: Arrays are data structures that store multiple values.

Your behavior:
1. Be conversational and helpful
2. Output clean, formatted markdown
3. Follow format templates EXACTLY - do not deviate
4. Do NOT explain your reasoning process
5. For general questions, provide clear explanations
6. Be encouraging and supportive

REMEMBER: When given a format template with examples, copy that structure precisely. Users' applications depend on exact formatting!"""


def _format_history_for_langchain(history: List[Dict[str, str]]) -> List:
    """Convert conversation history to LangChain message format."""
    messages = []
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            messages.append(AIMessage(content=msg["content"]))
    return messages


def _detect_and_enhance_message(message: str) -> tuple[str, Optional[str]]:
    """
    Detect if message is an artifact generation request and enhance with template.
    
    Returns:
        Tuple of (enhanced_message, artifact_type)
    """
    artifact_type = detect_artifact_type(message)
    
    if not artifact_type:
        return message, None
    
    # Extract topics/parameters from the message
    # Look for patterns like "about X", "on X", "for X"
    topics_match = re.search(r'(?:about|on|for|of)\s+([^.!?]+)', message, re.IGNORECASE)
    topics = topics_match.group(1).strip() if topics_match else "the selected topics"
    
    # Extract number if present (for quizzes, problems, etc.)
    num_match = re.search(r'(\d+)\s+(?:questions?|problems?|cards?)', message, re.IGNORECASE)
    num_items = int(num_match.group(1)) if num_match else 5
    
    # Extract difficulty if present
    difficulty_match = re.search(r'(easy|medium|hard|difficult)', message, re.IGNORECASE)
    difficulty = difficulty_match.group(1).lower() if difficulty_match else "medium"
    
    # Apply appropriate template
    enhanced_message = message
    
    if artifact_type == 'quiz':
        enhanced_message = format_quiz_prompt(
            topics=topics,
            num_questions=num_items,
            difficulty=difficulty
        )
    elif artifact_type == 'mindmap':
        enhanced_message = format_mindmap_prompt(topics=topics)
    elif artifact_type == 'flashcards':
        enhanced_message = format_flashcards_prompt(topics=topics)
    elif artifact_type == 'course-finder':
        enhanced_message = format_course_finder_prompt(topics=topics)
    elif artifact_type == 'reports':
        enhanced_message = format_reports_prompt(topics=topics)
    elif artifact_type == 'infographic':
        enhanced_message = format_infographic_prompt(topics=topics)
    elif artifact_type == 'study-plan':
        # Try to extract duration
        duration_match = re.search(r'(\d+)\s+(day|week|month)s?', message, re.IGNORECASE)
        duration = f"{duration_match.group(1)} {duration_match.group(2)}s" if duration_match else "2 weeks"
        
        hours_match = re.search(r'(\d+)\s+hours?\s+(?:per\s+)?day', message, re.IGNORECASE)
        hours = int(hours_match.group(1)) if hours_match else 2
        
        enhanced_message = format_study_plan_prompt(
            topics=topics,
            duration=duration,
            hours_per_day=hours
        )
    elif artifact_type == 'practice-problems':
        enhanced_message = format_practice_problems_prompt(
            topics=topics,
            num_problems=num_items,
            difficulty=difficulty
        )
    elif artifact_type == 'summary':
        length_match = re.search(r'(brief|short|detailed|comprehensive)', message, re.IGNORECASE)
        length = length_match.group(1).lower() if length_match else "moderate"
        if length in ['short', 'brief']:
            length = 'brief'
        elif length in ['detailed', 'comprehensive']:
            length = 'detailed'
        
        enhanced_message = format_summary_prompt(topics=topics, length=length)
    
    return enhanced_message, artifact_type


def _create_agent_executor(
    user_id: str,
    notebook_id: Optional[str] = None
):
    """
    Create a simple LLM executor (simplified version without tools for now).
    
    Args:
        user_id: User identifier for tool context
        notebook_id: Optional notebook context
    
    Returns:
        LLM instance
    """
    # Get LLM
    llm = get_langchain_llm()
    return llm


async def run_agent(
    user_id: str,
    session_id: str,
    message: str,
    notebook_id: Optional[str] = None,
    stream: bool = True
) -> AsyncGenerator[str, None]:
    """
    Run agent with user message and stream response.
    
    This is the main entry point for chat interactions.
    
    Args:
        user_id: User identifier
        session_id: Session/conversation identifier
        message: User's message
        notebook_id: Optional notebook context
        stream: Whether to stream response
    
    Yields:
        Response chunks (if streaming) or full response
        
    Example:
        >>> async for chunk in run_agent("user123", "session456", "Summarize my notes"):
        >>>     print(chunk, end="")
    """
    # 1. Detect artifact generation and enhance message
    enhanced_message, artifact_type = _detect_and_enhance_message(message)
    
    # 2. Load conversation history
    conv_manager = get_conversation_manager()
    history = conv_manager.get_history(user_id, session_id, limit=10)
    langchain_history = _format_history_for_langchain(history)
    
    # 3. Get LLM (simplified executor)
    llm = _create_agent_executor(user_id, notebook_id)
    
    # 4. Create prompt with system message and history
    prompt = ChatPromptTemplate.from_messages([
        ("system", STUDY_ASSISTANT_PROMPT),
        MessagesPlaceholder("chat_history", optional=True),
        ("human", "{input}"),
    ])
    
    # 5. Format the full prompt (use enhanced message if artifact detected)
    formatted_messages = prompt.format_messages(
        chat_history=langchain_history,
        input=enhanced_message
    )
    
    try:
        if stream:
            # Stream response token by token
            full_response = ""
            
            async for chunk in llm.astream(formatted_messages):
                if hasattr(chunk, 'content') and chunk.content:
                    token = chunk.content
                    full_response += token
                    yield token
            
            # Save conversation turn (save original message, not enhanced)
            conv_manager.save_turn(
                user_id=user_id,
                session_id=session_id,
                user_message=message,
                assistant_message=full_response,
                notebook_id=notebook_id,
                metadata={"artifact_type": artifact_type} if artifact_type else None
            )
        
        else:
            # Non-streaming response
            response = await llm.ainvoke(formatted_messages)
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Save conversation turn (save original message, not enhanced)
            conv_manager.save_turn(
                user_id=user_id,
                session_id=session_id,
                user_message=message,
                assistant_message=response_text,
                notebook_id=notebook_id,
                metadata={"artifact_type": artifact_type} if artifact_type else None
            )
            
            yield response_text
    
    except Exception as e:
        error_msg = f"I encountered an error: {str(e)}\n\nPlease try rephrasing your question."
        yield error_msg
        
        # Save error turn
        conv_manager.save_turn(
            user_id=user_id,
            session_id=session_id,
            user_message=message,
            assistant_message=error_msg,
            notebook_id=notebook_id,
            metadata={"error": str(e)}
        )


async def chat(
    user_id: str,
    session_id: str,
    message: str,
    notebook_id: Optional[str] = None
) -> str:
    """
    Non-streaming chat interface.
    
    Args:
        user_id: User identifier
        session_id: Session identifier
        message: User message
        notebook_id: Optional notebook context
    
    Returns:
        Complete assistant response
    """
    response = ""
    async for chunk in run_agent(user_id, session_id, message, notebook_id, stream=False):
        response += chunk
    return response


# Convenience function for tool injection
def inject_context_into_tools(tools: list, user_id: str, notebook_id: Optional[str] = None):
    """
    Inject user context into tools.
    
    This is needed because LangChain tools need user_id and notebook_id
    but these come from the agent runtime, not the tool definition.
    
    Args:
        tools: List of tools
        user_id: User identifier
        notebook_id: Optional notebook identifier
    
    Returns:
        Tools with context injected
    """
    # This is a workaround for LangChain's tool context management
    # In practice, we'll pass these through agent kwargs
    return tools
