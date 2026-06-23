import { apiClient } from './client';
import type { ChatSession, ChatMessage } from '../types';

export async function createChatSession(): Promise<ChatSession> {
  const response = await apiClient.post('/chat/sessions/');
  return response.data;
}

export async function getChatMessages(sessionId: string): Promise<ChatMessage[]> {
  const response = await apiClient.get(`/chat/sessions/${sessionId}/messages/`);
  return response.data;
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
  onToken: (token: string) => void,
  onError: (error: Error) => void,
  onDone: () => void
): Promise<void> {
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
  const token = apiClient.defaults.headers.common['Authorization'] as string || '';

  try {
    const response = await fetch(`${API_BASE_URL}/chat/sessions/${sessionId}/messages/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('AI is busy. Please try again in a moment.');
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              onToken(parsed.token);
            }
          } catch {
            // Ignore malformed SSE lines
          }
        }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}
