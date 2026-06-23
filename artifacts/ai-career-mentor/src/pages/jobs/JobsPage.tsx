import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateJobMatches, getJobMatches, updateJobMatch } from '../../api/jobs';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Briefcase, ExternalLink, Bookmark, CheckCircle, XCircle, AlertTriangle, Sparkles } from 'lucide-react';

export function JobsPage() {
  const queryClient = useQueryClient();
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  const jobsQuery = useQuery({
    queryKey: ['job-matches'],
    queryFn: getJobMatches,
    staleTime: 60 * 1000,
    refetchInterval: isGenerating ? 3000 : false,
    refetchIntervalInBackground: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateJobMatches('resume-1'),
    onMutate: () => {
      setRateLimitError(null);
      setIsGenerating(true);
    },
    onSuccess: () => {
      setTimeout(() => {
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ['job-matches'] });
      }, 2000);
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      if (error.message.includes('429') || error.message.includes('503') || error.message.includes('busy')) {
        setRateLimitError('The AI is busy right now. Try again in a moment.');
        setRetryAfter(30);
      } else {
        setRateLimitError(error.message || 'Generation failed. Please try again.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'saved' | 'applied' | 'dismissed' }) =>
      updateJobMatch(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-matches'] });
    },
  });

  if (jobsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Matches</h1>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (jobsQuery.error) {
    return <ErrorState onRetry={() => jobsQuery.refetch()} />;
  }

  const jobs = jobsQuery.data || [];

  const handleStatusChange = (id: string, status: 'saved' | 'applied' | 'dismissed') => {
    updateMutation.mutate({ id, status });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Job Matches</h1>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
          isLoading={generateMutation.isPending || isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Find Matches'}
        </Button>
      </div>

      {rateLimitError && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-900">{rateLimitError}</p>
            {retryAfter > 0 && (
              <p className="text-xs text-yellow-700 mt-1">
                You can retry in {retryAfter} second{retryAfter !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        </div>
      )}

      {jobs.length === 0 ? (
        <EmptyState
          title="No job matches yet"
          message="Let the AI find jobs that match your skills and experience from your resume."
          action={
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
              isLoading={generateMutation.isPending || isGenerating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Find Job Matches'}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} onStatusChange={handleStatusChange} isUpdating={updateMutation.isPending} />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({
  job,
  onStatusChange,
  isUpdating,
}: {
  job: { id: string; title: string; company: string; location: string; fit_score: number; match_reasoning: string; salary_range?: string; job_url?: string; status: string };
  onStatusChange: (id: string, status: 'saved' | 'applied' | 'dismissed') => void;
  isUpdating: boolean;
}) {
  const statusColors: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    new: 'info',
    saved: 'warning',
    applied: 'success',
    dismissed: 'default',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3">
            <Briefcase className="w-8 h-8 text-gray-400 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
              <p className="text-sm text-gray-600">
                {job.company} · {job.location}
              </p>
              {job.salary_range && (
                <p className="text-sm text-green-600 font-medium mt-0.5">{job.salary_range}</p>
              )}
            </div>
          </div>
          <Badge variant={statusColors[job.status] || 'default'}>{job.status}</Badge>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-blue-900">{job.fit_score}% Fit</span>
          </div>
          <p className="text-sm text-blue-900">{job.match_reasoning}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View Job Posting
            </a>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          {job.status !== 'saved' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onStatusChange(job.id, 'saved')}
              disabled={isUpdating}
            >
              <Bookmark className="w-4 h-4 mr-1" />
              Save
            </Button>
          )}
          {job.status !== 'applied' && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStatusChange(job.id, 'applied')}
              disabled={isUpdating}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Applied
            </Button>
          )}
          {job.status !== 'dismissed' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange(job.id, 'dismissed')}
              disabled={isUpdating}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Dismiss
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
