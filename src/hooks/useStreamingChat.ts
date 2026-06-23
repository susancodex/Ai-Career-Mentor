import { useState, useCallback, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createChatSession, getChatMessages, sendChatMessage } from '../api/chat';
import type { ChatMessage } from '../types';

export function useStreamingChat(sessionId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number>(0);
  const abortRef = useRef(false);
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['chat-session', sessionId],
    queryFn: () => getChatMessages(sessionId!),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
  });

  const createSessionMutation = useMutation({
    mutationFn: createChatSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      setMessages([]);
      setStreamingContent('');
    },
  });

  const sendMessage = useCallback(
    async (content: string) => {
      setRateLimitError(null);
      setRetryAfter(0);
      setIsStreaming(true);
      setStreamingContent('');
      abortRef.current = false;

      const currentSessionId = sessionId || createSessionMutation.data?.id;
      if (!currentSessionId) {
        setIsStreaming(false);
        return;
      }

      // Optimistically add user message
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        session_id: currentSessionId,
        role: 'user',
        content,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      let accumulated = '';

      await sendChatMessage(
        currentSessionId,
        content,
        (token) => {
          if (abortRef.current) return;
          accumulated += token;
          setStreamingContent(accumulated);
        },
        (error) => {
          setIsStreaming(false);
          if (error.message.includes('429') || error.message.includes('busy')) {
            setRateLimitError('AI is busy. Please try again in a moment.');
            setRetryAfter(30);
          } else {
            setRateLimitError(error.message);
          }
        },
        () => {
          setIsStreaming(false);
          setStreamingContent('');
          const assistantMessage: ChatMessage = {
            id: `temp-answer-${Date.now()}`,
            session_id: currentSessionId,
            role: 'assistant',
            content: accumulated,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          queryClient.invalidateQueries({ queryKey: ['chat-session', currentSessionId] });
        }
      );
    },
    [sessionId, createSessionMutation.data?.id, queryClient]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current = true;
    setIsStreaming(false);
  }, []);

  const allMessages = sessionQuery.data
    ? [...sessionQuery.data, ...messages]
    : messages;

  return {
    messages: allMessages,
    streamingContent,
    isStreaming,
    rateLimitError,
    retryAfter,
    isLoading: sessionQuery.isLoading,
    error: sessionQuery.error,
    sendMessage,
    stopStreaming,
    createSession: () => createSessionMutation.mutate(),
    isCreatingSession: createSessionMutation.isPending,
    sessionId: sessionId || createSessionMutation.data?.id,
  };
}
