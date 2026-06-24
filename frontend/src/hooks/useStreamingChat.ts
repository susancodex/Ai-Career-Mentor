import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChatSession, getChatMessages, sendChatMessage } from '../api/chat';
import type { ChatMessage } from '../types';

export function useStreamingChat() {
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number>(0);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const abortRef = useRef(false);
  const queryClient = useQueryClient();

  // Countdown timer for rate-limit retry
  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  // Load prior messages when a session is active
  const sessionQuery = useQuery({
    queryKey: ['chat-session', activeSessionId],
    queryFn: () => getChatMessages(activeSessionId!),
    enabled: !!activeSessionId,
    staleTime: 30 * 1000,
  });

  const createSessionMutation = useMutation({
    mutationFn: createChatSession,
    onSuccess: (data) => {
      setActiveSessionId(data.id);
      setLocalMessages([]);
      setStreamingContent('');
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    },
  });

  const sendMessage = useCallback(
    async (content: string) => {
      const sessionId = activeSessionId;
      if (!sessionId) return;

      setRateLimitError(null);
      setRetryAfter(0);
      setIsStreaming(true);
      setStreamingContent('');
      abortRef.current = false;

      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        session_id: sessionId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setLocalMessages((prev) => [...prev, userMessage]);

      let accumulated = '';

      await sendChatMessage(
        sessionId,
        content,
        (token) => {
          if (abortRef.current) return;
          accumulated += token;
          setStreamingContent(accumulated);
        },
        (error) => {
          setIsStreaming(false);
          if (error.message.includes('429') || error.message.includes('busy') || error.message.includes('503')) {
            setRateLimitError('The AI is busy right now — please retry in a moment.');
            setRetryAfter(30);
          } else {
            setRateLimitError(error.message || 'Something went wrong. Please try again.');
          }
        },
        () => {
          setIsStreaming(false);
          setStreamingContent('');
          const assistantMessage: ChatMessage = {
            id: `temp-answer-${Date.now()}`,
            session_id: sessionId,
            role: 'assistant',
            content: accumulated,
            created_at: new Date().toISOString(),
          };
          setLocalMessages((prev) => [...prev, assistantMessage]);
          queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
        }
      );
    },
    [activeSessionId, queryClient]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  // Merge server-fetched history with locally-tracked messages (deduplicate by id)
  const serverMessages = sessionQuery.data ?? [];
  const localIds = new Set(localMessages.map((m) => m.id));
  const mergedMessages = [
    ...serverMessages.filter((m) => !localIds.has(m.id)),
    ...localMessages,
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    messages: mergedMessages,
    streamingContent,
    isStreaming,
    rateLimitError,
    retryAfter,
    isLoading: sessionQuery.isLoading && !!activeSessionId,
    error: sessionQuery.error,
    sendMessage,
    stopStreaming,
    createSession: () => createSessionMutation.mutate(),
    isCreatingSession: createSessionMutation.isPending,
    sessionId: activeSessionId,
  };
}
