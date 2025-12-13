"""
Email Classification Service

Provides email classification and draft generation using LangChain.
This is a lightweight alternative to the full LangGraph implementation.
"""

import os
from typing import AsyncIterator, Dict, Any, Literal
from pydantic import BaseModel, Field
from langchain_openai import ChatOpenAI
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_core.output_parsers import JsonOutputParser


class ClassificationResult(BaseModel):
    """Structured output for email classification"""
    reasoning: str = Field(description="Step-by-step reasoning behind the classification")
    classification: Literal["ignore", "respond", "notify"] = Field(
        description="The classification: 'ignore', 'notify', or 'respond'"
    )


class EmailClassificationService:
    """
    Service for classifying emails and generating drafts using LangChain.
    
    This provides the same functionality as the LangGraph implementation
    but runs embedded without requiring a separate server.
    """
    
    def __init__(self):
        """Initialize the service with LangChain components"""
        self.model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.llm = ChatOpenAI(
            model=self.model_name,
            temperature=0.7, # 0.7 for more creative responses
            streaming=True # Enable streaming for real-time updates
        )
        
        # Prompts (copied from src/ai_email_coach/prompts.py and put at the end of this file)
        self.triage_system_prompt = self._get_triage_system_prompt()
        self.draft_system_prompt = self._get_draft_system_prompt()
        self.background = self._get_background()
        self.triage_instructions = self._get_triage_instructions()
        self.response_preferences = self._get_response_preferences()
    
    async def classify_email(
        self,
        author: str,
        to: str,
        subject: str,
        email_thread: str
    ) -> Dict[str, Any]:
        """
        Classify an email (blocking call).
        
        Args:
            author: Email sender
            to: Email recipient
            subject: Email subject
            email_thread: Email body/thread
            
        Returns:
            Dict with 'classification' and 'reasoning'
        """
        # Use structured output for classification
        llm_with_structure = self.llm.with_structured_output(ClassificationResult)
        
        system_prompt = self.triage_system_prompt.format(
            background=self.background,
            triage_instructions=self.triage_instructions
        )
        
        user_prompt = f"""Please determine how to handle the below email thread:

            From: {author}
            To: {to}
            Subject: {subject}
            {email_thread}
        """
        
        result = await llm_with_structure.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        
        return {
            "classification": result.classification,
            "reasoning": result.reasoning
        }
    
    async def generate_draft(
        self,
        author: str,
        to: str,
        subject: str,
        email_thread: str # Full email thread
    ) -> str: 
        """
        Generate an email draft (blocking call).
        
        Args:
            author: Email sender
            to: Email recipient
            subject: Email subject
            email_thread: Full email body/thread
            
        Returns:
            Generated draft text
        """
        system_prompt = self.draft_system_prompt.format(
            background=self.background,
            response_preferences=self.response_preferences
        )
        
        user_prompt = f"""Respond to the email:

            From: {author}
            To: {to}
            Subject: {subject}

            {email_thread}
        """
        
        response = await self.llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_prompt)
        ])
        
        return response.content
    

    # ===== Streaming Classification and Draft  =====
    async def classify_and_draft_stream(
        self,
        author: str,
        to: str,
        subject: str,
        email_thread: str # Full email thread
    ) -> AsyncIterator[Dict[str, Any]]: # yields (not returns) events
        """
        Classify email and generate draft with streaming events.
        
        Yields events in the format:
        {
            "event": "thinking" | "reasoning_chunk" | "classification" | "draft_start" | "draft_chunk" | "complete",
            "data": {...}
        }
        """
        # PHASE 1: Stream reasoning analysis
        ## Emit a "thinking" event to notify the UI that analysis has started
        yield {
            "event": "thinking",
            "data": {"message": "Analyzing email..."}
        }
        
        system_prompt = self.triage_system_prompt.format(
            background=self.background,
            triage_instructions=self.triage_instructions
        )
        
        # Stream the reasoning naturally (no JSON formatting)
        reasoning_prompt = f"""Analyze this email and explain your reasoning for how to handle it:

            From: {author}
            To: {to}
            Subject: {subject}
            {email_thread}

            Provide a step-by-step analysis of whether this should be ignored, just noted, or requires a response.
        """
        
        # Stream the reasoning/thinking
        reasoning_chunks = []
        async for chunk in self.llm.astream([ # get streaming responses from the LLM
            SystemMessage(content=system_prompt),
            HumanMessage(content=reasoning_prompt)
        ]):
            if chunk.content:
                reasoning_chunks.append(chunk.content) # As each chunk arrives, it immediately yields a "reasoning_chunk" event
                yield {
                    "event": "reasoning_chunk",
                    "data": {"chunk": chunk.content}
                }
        
        reasoning = "".join(reasoning_chunks) # join all chunks into a single string for later classification
        
        # PHASE 2: Quick classification decision (non-streaming)
        classification_prompt = f"""Based on this analysis: "{reasoning}"

Classify this email as one word only: ignore, notify, or respond"""
        
        classification_response = await self.llm.ainvoke([
            SystemMessage(content="You are a classification assistant. Respond with only one word."),
            HumanMessage(content=classification_prompt)
        ])
        
        # Extract classification
        classification_text = classification_response.content.strip().lower()
        if "respond" in classification_text:
            classification = "respond"
        elif "ignore" in classification_text:
            classification = "ignore"
        else:
            classification = "notify"
        
        yield {
            "event": "classification",
            "data": {
                "classification": classification,
                "reasoning": reasoning
            }
        }
        
        # PHASE 3: Draft generation (if respond)
        ai_draft = None
        if classification == "respond":
            yield {
                "event": "draft_start",
                "data": {"message": "Generating draft response..."}
            }
            
            draft_system_prompt = self.draft_system_prompt.format(
                background=self.background,
                response_preferences=self.response_preferences
            )
            
            draft_user_prompt = f"""Respond to the email:

                From: {author}
                To: {to}
                Subject: {subject}

                {email_thread}
            """
            
            # Stream the draft generation
            draft_chunks = []
            async for chunk in self.llm.astream([ # get streaming responses from the LLM
                SystemMessage(content=draft_system_prompt),
                HumanMessage(content=draft_user_prompt)
            ]):
                if chunk.content:
                    draft_chunks.append(chunk.content) # As each chunk arrives, it immediately yields a "draft_chunk" event
                    yield {
                        "event": "draft_chunk",
                        "data": {"chunk": chunk.content}
                    }
            
            ai_draft = "".join(draft_chunks)
        
        # Final event
        yield {
            "event": "complete",
            "data": {
                "classification": classification,
                "reasoning": reasoning,
                "ai_draft": ai_draft
            }
        }
    
    # ===== Prompt Templates =====  ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== =====
    
    def _get_triage_system_prompt(self) -> str:
        """Triage system prompt"""
        return """
< Role >
Your role is to triage incoming emails based upon instructs and background information below.
</ Role >

< Background >
{background}
</ Background >

< Instructions >
Categorize each email into one of three categories:
1. IGNORE - Emails that are not worth responding to or tracking
2. NOTIFY - Important information that worth notification but doesn't require a response
3. RESPOND - Emails that need a direct response
Classify the below email into one of these categories.
Then, provide a short explanation (reasoning) for why you chose this category.
</ Instructions >

< Rules >
{triage_instructions}
</ Rules >
"""
    
    def _get_draft_system_prompt(self) -> str:
        """Draft generation system prompt"""
        return """
< Role >
You are a top-notch executive assistant who cares about helping your executive perform as well as possible.
</ Role >

< Instructions >
Draft a professional email response to the email provided.
</ Instructions >

< Background >
{background}
</ Background >

< Response Preferences >
{response_preferences}
</ Response Preferences >
"""
    
    def _get_background(self) -> str:
        """User background information"""
        return "I'm Nazmus, a graduate student at UAEU."
    
    def _get_triage_instructions(self) -> str:
        """Triage classification rules"""
        return """
Emails that are not worth responding to:
- Marketing newsletters and promotional emails
- Spam or suspicious emails

There are also other things that should be known about, but don't require an email response. For these, you should notify (using the `notify` response). Examples of this include:
- Blackboard notifications
- Research Gate, Elsevier researh paper
- Build system notifications or deployments
- UAEU Automatic notifications
- Important company announcements
- FYI emails that contain relevant information for current events
- HR Department deadline reminders
- Subscription status / renewal reminders
- Helpdesk password expiry
- Course material, grade updates

Emails that are worth responding to:
- Direct questions from professors, students
- Meeting requests requiring confirmation
- Event or conference invitations
- collaboration or project-related requests
"""
    
    def _get_response_preferences(self) -> str:
        """Email response style preferences"""
        return """
Use professional and concise language. If the e-mail mentions a deadline, make sure to explicitly acknowledge and reference the deadline in your response.

When responding to direct questions from professors, students:
- Clearly state whether you will investigate or who you will ask
- Provide an estimated timeline for when you'll be able to respond

When responding to event or conference invitations:
- Always acknowledge any mentioned deadlines (particularly registration deadlines)
- If workshops or specific topics are mentioned, ask for more specific details about them
- If discounts (group or early bird) are mentioned, explicitly request information about them
- Don't commit 

When responding to collaboration or project-related requests:
- Acknowledge any existing work or materials mentioned (drafts, slides, documents, etc.)
- Explicitly mention reviewing these materials before or during the meeting
- When scheduling meetings, clearly state the specific day, date, and time proposed
"""


# Singleton instance =====  ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== ===== =====
# The singleton pattern ensures that only one instance of the EmailClassificationService is created and reused throughout the application.

# Global variable to hold the single instance
_service_instance = None

def get_classification_service() -> EmailClassificationService:
    """Get or create the classification service singleton"""
    global _service_instance
    if _service_instance is None:
        _service_instance = EmailClassificationService()
    return _service_instance
