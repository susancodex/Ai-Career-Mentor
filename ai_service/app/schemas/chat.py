from typing import Optional
from pydantic import BaseModel


class ChatMessageRequest(BaseModel):
    session_id: str
    user_id: str
    content: str


class ChatTokenEvent(BaseModel):
    type: str = "token"
    content: str


class ChatDoneEvent(BaseModel):
    type: str = "done"


class ChatErrorEvent(BaseModel):
    type: str = "error"
    content: str


class ChatRateLimitedEvent(BaseModel):
    type: str = "rate_limited"
    content: str = "The AI is at capacity, please retry shortly."
