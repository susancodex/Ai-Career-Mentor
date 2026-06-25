import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStreamingChat } from '../../hooks/useStreamingChat';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Send, AlertTriangle, StopCircle, Bot, User } from 'lucide-react';
import { SkeletonText } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const messageVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } }
};

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
    if (messages.length > 0 || streamingContent) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    sendMessage(input.trim());
    setInput('');
  };

  if (isLoading && messages.length === 0) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Career Coach</h1>
        <Card className="border-0 shadow-premium">
          <CardContent className="p-8">
            <SkeletonText lines={6} />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && messages.length === 0) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className="h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)] flex flex-col max-w-4xl mx-auto"
    >
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">AI Career Coach</h1>
        <p className="text-slate-500 mt-1">Get personalized advice for your career journey.</p>
      </div>

      {!sessionId ? (
        <Card className="flex-1 flex items-center justify-center border-0 shadow-float bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent" />
          <CardContent className="text-center p-8 md:p-12 relative z-10 max-w-lg">
            <div className="w-20 h-20 bg-primary/20 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-primary/30">
              <Bot className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Start a conversation</h2>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              I'm your personal AI career advisor. Ask me about resume optimization, interview strategies, salary negotiation, or navigating career transitions.
            </p>
            <Button 
              onClick={() => createSession()} 
              isLoading={isCreatingSession}
              size="lg"
              className="w-full sm:w-auto font-bold text-base px-8 bg-primary hover:bg-primary-hover text-white border-0 shadow-lg shadow-primary/30"
            >
              Start New Chat
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-premium bg-white">
          <CardContent className="flex-1 p-0 flex flex-col h-full relative">
            <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-white to-transparent z-10 pointer-events-none" />
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 custom-scrollbar">
              {messages.length === 0 && !isStreaming && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
                  <Bot className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-500">I'm ready to help. What's on your mind?</p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    variants={messageVariants}
                    initial="hidden"
                    animate="show"
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-sm ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-slate-900 text-primary'}`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                      </div>
                      <div
                        className={`rounded-2xl px-5 py-4 shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-white rounded-tr-sm'
                            : 'bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-sm'
                        }`}
                      >
                        <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {isStreaming && (
                  <motion.div
                    key="streaming"
                    variants={messageVariants}
                    initial="hidden"
                    animate="show"
                    className="flex justify-start"
                  >
                    <div className="flex gap-3 max-w-[85%]">
                      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-sm bg-slate-900 text-primary">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="rounded-2xl rounded-tl-sm px-5 py-4 shadow-sm bg-slate-50 border border-slate-100 text-slate-800 min-w-[100px]">
                        {streamingContent ? (
                          <>
                            <p className="text-[15px] leading-relaxed whitespace-pre-wrap inline">{streamingContent}</p>
                            <span className="inline-block w-2 h-4 bg-primary ml-1 align-middle animate-pulse" />
                          </>
                        ) : (
                          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 h-6">
                            <span className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} className="h-1" />
            </div>

            <div className="p-4 sm:p-6 bg-white border-t border-slate-100">
              <AnimatePresence>
                {rateLimitError && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 overflow-hidden"
                  >
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <p className="text-sm font-medium text-amber-900">{rateLimitError}</p>
                      {retryAfter > 0 && (
                        <p className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                          Retry in {retryAfter}s
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleSubmit} className="flex gap-3 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for resume advice, interview tips, etc..."
                  disabled={isStreaming}
                  className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent focus:bg-white transition-all text-slate-900 placeholder:text-slate-400 shadow-sm disabled:opacity-50"
                />
                {isStreaming ? (
                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={stopStreaming}
                    className="absolute right-2 top-2 bottom-2 aspect-square p-0 rounded-lg"
                  >
                    <StopCircle className="w-5 h-5" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={!input.trim()}
                    className="absolute right-2 top-2 bottom-2 aspect-square p-0 rounded-lg bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                )}
              </form>
              <p className="text-center text-xs text-slate-400 mt-3 font-medium">AI Career Coach can make mistakes. Verify important advice.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
