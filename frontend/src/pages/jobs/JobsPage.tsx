import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { generateJobMatches, getJobMatches, updateJobMatch } from '../../api/jobs';
import { useResumeUpload } from '../../hooks/useResumeUpload';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ExternalLink, Bookmark, CheckCircle, XCircle, AlertTriangle, Sparkles, Building2, MapPin, DollarSign } from 'lucide-react';

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

export function JobsPage() {
  const queryClient = useQueryClient();
  const { resumes } = useResumeUpload();
  const selectedResumeId = resumes.find((r) => r.status === 'parsed')?.id || '';
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
    mutationFn: () => generateJobMatches(selectedResumeId),
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Job Matches</h1>
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
    <motion.div 
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className="space-y-8 max-w-5xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Job Matches</h1>
          <p className="text-slate-500 mt-1 text-lg">Curated opportunities aligned with your skills.</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
          isLoading={generateMutation.isPending || isGenerating}
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Find Matches'}
        </Button>
      </div>

      {rateLimitError && (
        <motion.div variants={itemVariants} className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-amber-900">{rateLimitError}</p>
            {retryAfter > 0 && (
              <p className="text-xs text-amber-700 mt-1 font-medium">
                You can retry in {retryAfter} second{retryAfter !== 1 ? 's' : ''}.
              </p>
            )}
          </div>
        </motion.div>
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
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Find Job Matches'}
            </Button>
          }
        />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-6">
          {jobs.map((job) => (
            <motion.div variants={itemVariants} key={job.id}>
              <JobCard job={job} onStatusChange={handleStatusChange} isUpdating={updateMutation.isPending} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
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

  const isDismissed = job.status === 'dismissed';

  return (
    <Card className={`hover:shadow-lg transition-all duration-300 ${isDismissed ? 'opacity-60 grayscale-[0.5]' : ''}`}>
      <CardContent className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
          <div className="flex items-start gap-5 flex-1">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
              <Building2 className="w-7 h-7 text-slate-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-bold text-slate-900 leading-tight">{job.title}</h3>
                <Badge variant={statusColors[job.status] || 'default'} className="shadow-sm">{job.status}</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-600">
                <span className="flex items-center gap-1.5"><Building2 className="w-4 h-4 text-slate-400" /> {job.company}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-slate-400" /> {job.location}</span>
                {job.salary_range && (
                  <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                    <DollarSign className="w-4 h-4" /> {job.salary_range}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end shrink-0 pl-19 md:pl-0">
            <div className="flex items-center justify-center w-16 h-16 rounded-full border-[4px] border-primary/20 relative">
               <span className="text-lg font-black text-primary">{job.fit_score}</span>
               {/* Decorative ring */}
               <svg className="absolute inset-0 w-full h-full -rotate-90">
                 <circle cx="30" cy="30" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="175" strokeDashoffset={175 - (175 * job.fit_score) / 100} className="text-primary transition-all duration-1000 ease-out" />
               </svg>
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-2">Fit Score</span>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-xl p-5 mb-6 md:ml-19">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold text-slate-900">Why you're a strong fit</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{job.match_reasoning}</p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:ml-19">
          <div className="flex flex-wrap gap-2">
            {job.status !== 'saved' && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => onStatusChange(job.id, 'saved')}
                disabled={isUpdating}
                className="font-semibold"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Save Job
              </Button>
            )}
            {job.status !== 'applied' && (
              <Button
                variant="primary"
                size="md"
                onClick={() => onStatusChange(job.id, 'applied')}
                disabled={isUpdating}
                className="font-semibold shadow-md shadow-primary/20"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark Applied
              </Button>
            )}
            {job.status !== 'dismissed' && (
              <Button
                variant="ghost"
                size="md"
                onClick={() => onStatusChange(job.id, 'dismissed')}
                disabled={isUpdating}
                className="text-slate-500 hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Dismiss
              </Button>
            )}
          </div>

          {job.job_url && (
            <a
              href={job.job_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2.5 rounded-lg transition-colors focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              View Posting
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
