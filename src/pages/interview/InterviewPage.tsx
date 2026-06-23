import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createInterviewSession, generateQuestions, getInterviewSession, submitAnswer } from '../../api/interviews';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Send, BrainCircuit, Award } from 'lucide-react';

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
        <h1 className="text-2xl font-bold text-gray-900">Interview Practice</h1>
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Interview Practice</h1>

      {!sessionId ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  What role are you interviewing for?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder="e.g. Staff Frontend Engineer"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button onClick={handleCreateSession} disabled={!targetRole.trim()}>
                    Start Session
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {sessionQuery.isLoading ? (
            <SkeletonCard />
          ) : sessionQuery.error ? (
            <ErrorState onRetry={() => sessionQuery.refetch()} />
          ) : sessionQuery.data ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {sessionQuery.data.target_role}
                  </h2>
                  <Badge variant={sessionQuery.data.status === 'ready' ? 'success' : 'warning'}>
                    {sessionQuery.data.status}
                  </Badge>
                </div>
                {sessionQuery.data.questions.length === 0 && (
                  <Button
                    onClick={handleGenerateQuestions}
                    isLoading={generateMutation.isPending}
                  >
                    <BrainCircuit className="w-4 h-4 mr-2" />
                    Generate Questions
                  </Button>
                )}
              </div>

              {sessionQuery.data.questions.length === 0 ? (
                <EmptyState
                  title="No questions yet"
                  message="Generate AI interview questions for your target role."
                />
              ) : (
                <div className="space-y-4">
                  {sessionQuery.data.questions.map((question) => (
                    <QuestionCard key={question.id} question={question} sessionId={sessionId} />
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function QuestionCard({ question, sessionId }: { question: { id: string; category: 'behavioral' | 'technical'; question: string; user_answer?: string; ai_feedback?: string; score?: number }; sessionId: string }) {
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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <Badge variant={question.category === 'technical' ? 'info' : 'warning'}>
            {question.category}
          </Badge>
        </div>
        <p className="text-gray-900 font-medium mb-4">{question.question}</p>

        {!showFeedback ? (
          <div className="space-y-3">
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <Button
              onClick={handleSubmit}
              isLoading={answerMutation.isPending}
              disabled={!answer.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit for Feedback
            </Button>
            {answerMutation.error && (
              <p className="text-sm text-red-600">
                {answerMutation.error instanceof Error ? answerMutation.error.message : 'Failed to submit'}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Your Answer:</p>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{answer || question.user_answer}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">AI Feedback</span>
                {question.score && (
                  <Badge variant="success">{question.score}/100</Badge>
                )}
              </div>
              <p className="text-sm text-blue-900">
                {question.ai_feedback || answerMutation.data?.ai_feedback}
              </p>
              {(question.score || answerMutation.data?.score) && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">Score:</span>
                  <div className="flex-1 bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${question.score || answerMutation.data?.score || 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-blue-900">
                    {question.score || answerMutation.data?.score}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
