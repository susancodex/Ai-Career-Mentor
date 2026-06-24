import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createInterviewSession, generateQuestions, getInterviewSession, submitAnswer } from '../../api/interviews';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Send, BrainCircuit, Award, MessageSquareQuote, CheckCircle2, ChevronRight } from 'lucide-react';

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

export function InterviewPage() {
  const [targetRole, setTargetRole] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: ['interview-session', sessionId],
    queryFn: () => getInterviewSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'pending') return 3000;
      return false;
    },
  });

  const createMutation = useMutation({
    mutationFn: createInterviewSession,
    onSuccess: (data) => {
      setSessionId(data.id);
    },
  });

  const generateMutation = useMutation({
    mutationFn: generateQuestions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-session', sessionId] });
    },
  });

  const handleCreateSession = () => {
    if (targetRole.trim()) {
      createMutation.mutate(targetRole.trim());
    }
  };

  const handleGenerateQuestions = () => {
    if (sessionId) {
      generateMutation.mutate(sessionId);
    }
  };

  if (createMutation.isPending) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Interview Practice</h1>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className="space-y-8 max-w-4xl"
    >
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Interview Practice</h1>
        <p className="text-slate-500 mt-1 text-lg">Sharpen your answers with real-time AI feedback.</p>
      </div>

      {!sessionId ? (
        <Card className="border-0 shadow-float overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary to-blue-400" />
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <MessageSquareQuote className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Set up your mock interview</h2>
            <p className="text-slate-500 mb-8 max-w-lg mx-auto">
              Tell us the specific role you're targeting, and we'll generate tailored behavioral and technical questions to test your readiness.
            </p>
            <div className="max-w-md mx-auto space-y-4 text-left">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">
                  Target Role
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  />
                  <Button 
                    onClick={handleCreateSession} 
                    disabled={!targetRole.trim()}
                    size="lg"
                    className="shrink-0 font-bold"
                  >
                    Start Session
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div variants={itemVariants}>
          {sessionQuery.isLoading ? (
            <SkeletonCard />
          ) : sessionQuery.error ? (
            <ErrorState onRetry={() => sessionQuery.refetch()} />
          ) : sessionQuery.data ? (
            <div className="space-y-6">
              <Card className="bg-slate-900 text-white border-0 shadow-xl">
                <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <Badge variant={sessionQuery.data.status === 'ready' ? 'success' : 'warning'} className="mb-3 bg-white/10 text-white border-white/20">
                      {sessionQuery.data.status === 'ready' ? 'Session Ready' : 'Preparing...'}
                    </Badge>
                    <h2 className="text-2xl font-bold text-white mb-1">
                      {sessionQuery.data.target_role}
                    </h2>
                    <p className="text-slate-400 text-sm">Mock Interview Session</p>
                  </div>
                  {sessionQuery.data.questions.length === 0 && (
                    <Button
                      onClick={handleGenerateQuestions}
                      isLoading={generateMutation.isPending}
                      variant="primary"
                      size="lg"
                      className="bg-white text-slate-900 hover:bg-slate-100 shrink-0"
                    >
                      <BrainCircuit className="w-5 h-5 mr-2 text-primary" />
                      Generate Questions
                    </Button>
                  )}
                </CardContent>
              </Card>

              {sessionQuery.data.questions.length === 0 ? (
                <EmptyState
                  title="No questions generated yet"
                  message="Click the button above to generate a custom set of interview questions for your target role."
                />
              ) : (
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
                  {sessionQuery.data.questions.map((question, index) => (
                    <motion.div variants={itemVariants} key={question.id}>
                      <QuestionCard question={question} sessionId={sessionId} index={index + 1} />
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          ) : null}
        </motion.div>
      )}
    </motion.div>
  );
}

function QuestionCard({ question, sessionId, index }: { question: { id: string; category: 'behavioral' | 'technical'; question: string; user_answer?: string; ai_feedback?: string; score?: number }; sessionId: string; index: number }) {
  const [answer, setAnswer] = useState(question.user_answer || '');
  const [showFeedback, setShowFeedback] = useState(!!question.ai_feedback);
  const queryClient = useQueryClient();

  const answerMutation = useMutation({
    mutationFn: () => submitAnswer(question.id, answer),
    onSuccess: () => {
      setShowFeedback(true);
      queryClient.invalidateQueries({ queryKey: ['interview-session', sessionId] });
    },
  });

  const handleSubmit = () => {
    if (answer.trim()) {
      answerMutation.mutate();
    }
  };

  return (
    <Card className={`overflow-hidden transition-all duration-300 border-l-4 ${showFeedback ? 'border-l-emerald-500' : 'border-l-primary'}`}>
      <CardContent className="p-0">
        <div className="p-6 md:p-8 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-3 mb-4">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm">
              {index}
            </span>
            <Badge variant={question.category === 'technical' ? 'info' : 'warning'} className="uppercase tracking-wider text-xs">
              {question.category}
            </Badge>
            {showFeedback && (
              <Badge variant="success" className="ml-auto flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Answered
              </Badge>
            )}
          </div>
          <p className="text-xl font-bold text-slate-900 leading-snug">{question.question}</p>
        </div>

        <div className="p-6 md:p-8 bg-slate-50">
          <AnimatePresence mode="wait">
            {!showFeedback ? (
              <motion.div 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="relative">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Structure your answer using the STAR method (Situation, Task, Action, Result)..."
                    rows={6}
                    className="w-full px-5 py-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y text-slate-700 shadow-sm transition-all"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">
                    {answer.length > 0 ? `${answer.split(/\s+/).length} words` : '0 words'}
                  </span>
                  <Button
                    onClick={handleSubmit}
                    isLoading={answerMutation.isPending}
                    disabled={!answer.trim() || answer.trim().length < 10}
                    size="lg"
                    className="shadow-md shadow-primary/20"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit for AI Feedback
                  </Button>
                </div>
                {answerMutation.error && (
                  <p className="text-sm font-medium text-destructive mt-2 bg-destructive/10 p-3 rounded-lg">
                    {answerMutation.error instanceof Error ? answerMutation.error.message : 'Failed to submit'}
                  </p>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-6"
              >
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Your Answer</p>
                  <p className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed">{answer || question.user_answer}</p>
                </div>
                
                <div className="bg-white rounded-xl p-6 border-2 border-primary/20 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10" />
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Award className="w-5 h-5 text-primary" />
                      </div>
                      <span className="text-lg font-bold text-slate-900">AI Feedback</span>
                    </div>
                    
                    {(question.score || answerMutation.data?.score) && (
                      <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                        <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Score</span>
                        <div className="text-2xl font-black text-primary">
                          {question.score || answerMutation.data?.score}<span className="text-lg text-slate-400">/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-base text-slate-700 leading-relaxed relative z-10">
                    {question.ai_feedback || answerMutation.data?.ai_feedback}
                  </p>
                  
                  {(question.score || answerMutation.data?.score) && (
                    <div className="mt-6 pt-6 border-t border-slate-100">
                      <div className="flex items-center justify-between text-sm font-bold text-slate-500 mb-2">
                        <span>Readiness</span>
                        <span>{(question.score || answerMutation.data?.score || 0) >= 80 ? 'Strong' : (question.score || answerMutation.data?.score || 0) >= 60 ? 'Moderate' : 'Needs Work'}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${(question.score || answerMutation.data?.score || 0) >= 80 ? 'bg-emerald-500' : (question.score || answerMutation.data?.score || 0) >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${question.score || answerMutation.data?.score || 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
