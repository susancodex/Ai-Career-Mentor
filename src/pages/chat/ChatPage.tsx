import { useState, useRef, useEffect } from 'react';
import { useStreamingChat } from '../../hooks/useStreamingChat';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Send, Loader2, AlertTriangle, StopCircle, MessageSquare } from 'lucide-react';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

export function ChatPage() {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    streamingContent,
    isStreaming,
    rateLimitError,
    retryAfter,
    isLoading,
    error,
    sendMessage,
    stopStreaming,
    createSession,
    isCreatingSession,
    sessionId,
  } = useStreamingChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">AI Career Coach</h1>
        <Card>
          <CardContent className="p-6">
            <SkeletonText lines={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">AI Career Coach</h1>

      {!sessionId ? (
        <Card className="flex-1 flex items-center justify-center">
          <CardContent className="text-center p-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Start a conversation</h2>
            <p className="text-sm text-gray-500 mb-4">
              Ask your AI career coach anything about your career, skills, or job search.
            </p>
            <Button onClick={() => createSession()} isLoading={isCreatingSession}>
              Start Chat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
            {messages.length === 0 && !isStreaming && (
              <div className="text-center py-8">
                <p className="text-gray-500">Send a message to start chatting with your AI career coach.</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {isStreaming && streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
                  <p className="text-sm whitespace-pre-wrap">{streamingContent}</p>
                  <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse" />
                </div>
              </div>
            )}

            {isStreaming && !streamingContent && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-100 text-gray-900">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    AI is thinking...
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {rateLimitError && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">{rateLimitError}</p>
                {retryAfter > 0 && (
                  <p className="text-xs text-yellow-700 mt-1">
                    Please wait {retryAfter} seconds before retrying.
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your career coach..."
              disabled={isStreaming}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            {isStreaming ? (
              <Button type="button" variant="danger" onClick={stopStreaming}>
                <StopCircle className="w-5 h-5" />
              </Button>
            ) : (
              <Button type="submit" disabled={!input.trim()}>
                <Send className="w-5 h-5" />
              </Button>
            )}
          </form>
        </>
      )}
    </div>
  );
}
