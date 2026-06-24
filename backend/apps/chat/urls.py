from django.urls import path
from .views import ChatSessionCreateView, ChatMessagesDispatchView

urlpatterns = [
    path("chat/sessions/", ChatSessionCreateView.as_view(), name="chat-session-create"),
    # GET  → list messages | POST → SSE stream (matches API contract)
    path("chat/sessions/<uuid:pk>/messages/", ChatMessagesDispatchView.as_view(), name="chat-messages"),
]
