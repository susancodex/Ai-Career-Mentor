import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { generateRoadmap, getRoadmaps, updateResource } from '../../api/learning';
import { getSkillGaps } from '../../api/careers';
import { useResumeUpload } from '../../hooks/useResumeUpload';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { BookOpen, CheckCircle2, Clock, ExternalLink, AlertTriangle, Sparkles, Map, Video, FileText, Code } from 'lucide-react';
import type { LearningResource } from '../../types';

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

export function LearningPage() {
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

  const roadmapsQuery = useQuery({
    queryKey: ['learning-roadmaps'],
    queryFn: getRoadmaps,
    staleTime: 60 * 1000,
    refetchInterval: isGenerating ? 3000 : false,
    refetchIntervalInBackground: false,
  });

  const skillGapsQuery = useQuery({
    queryKey: ['skill-gaps', selectedResumeId],
    queryFn: () => getSkillGaps(selectedResumeId),
    enabled: !!selectedResumeId,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateRoadmap(skillGapsQuery.data?.id || ''),
    onMutate: () => {
      setRateLimitError(null);
      setIsGenerating(true);
    },
    onSuccess: () => {
      setTimeout(() => {
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ['learning-roadmaps'] });
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
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => updateResource(id, completed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-roadmaps'] });
    },
  });

  if (roadmapsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Learning Roadmap</h1>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (roadmapsQuery.error) {
    return <ErrorState onRetry={() => roadmapsQuery.refetch()} />;
  }

  const roadmaps = roadmapsQuery.data || [];

  const handleToggle = (id: string, completed: boolean) => {
    updateMutation.mutate({ id, completed: !completed });
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className="space-y-8 max-w-4xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Learning Roadmap</h1>
          <p className="text-slate-500 mt-1 text-lg">Your personalized path to mastering missing skills.</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
          isLoading={generateMutation.isPending || isGenerating}
          size="lg"
        >
          <Map className="w-5 h-5 mr-2" />
          {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Roadmap'}
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

      {roadmaps.length === 0 ? (
        <EmptyState
          title="No learning roadmaps yet"
          message="Generate a personalized step-by-step learning plan based on your skill gaps."
          action={
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
              isLoading={generateMutation.isPending || isGenerating}
              size="lg"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Learning Roadmap'}
            </Button>
          }
        />
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
          {roadmaps.map((roadmap) => {
            const completed = roadmap.resources.filter((r) => r.completed).length;
            const total = roadmap.resources.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <motion.div variants={itemVariants} key={roadmap.id}>
                <Card className="overflow-hidden border-0 shadow-premium">
                  <CardHeader className="bg-slate-900 text-white p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <BookOpen className="w-6 h-6 text-primary" />
                          </div>
                          <CardTitle className="text-2xl font-bold tracking-tight text-white">{roadmap.title}</CardTitle>
                        </div>
                        <p className="text-slate-300 text-base leading-relaxed max-w-2xl">{roadmap.description}</p>
                        <div className="flex items-center gap-4 mt-4">
                          <span className="flex items-center gap-1.5 text-sm font-medium bg-white/10 px-3 py-1.5 rounded-full text-slate-200">
                            <Clock className="w-4 h-4 text-primary" />
                            {roadmap.estimated_hours} hours total
                          </span>
                          <span className="text-sm font-medium text-slate-400">
                            {total} resources
                          </span>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-48 shrink-0 bg-white/5 rounded-xl p-4 border border-white/10">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">Progress</span>
                          <span className="text-xl font-black text-white">{pct}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs font-medium text-slate-400 text-right mt-2">{completed} of {total} completed</p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6 md:p-8 bg-slate-50">
                    <div className="relative max-w-3xl mx-auto">
                      {/* Timeline line */}
                      <div className="absolute left-6 top-4 bottom-8 w-0.5 bg-slate-200" />
                      
                      <div className="space-y-6">
                        {roadmap.resources
                          .slice()
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((resource, index) => (
                            <ResourceItem
                              key={resource.id}
                              resource={resource}
                              onToggle={handleToggle}
                              isUpdating={updateMutation.isPending}
                              index={index + 1}
                            />
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

function ResourceItem({
  resource,
  onToggle,
  isUpdating,
  index,
}: {
  resource: LearningResource;
  onToggle: (id: string, completed: boolean) => void;
  isUpdating: boolean;
  index: number;
}) {
  const typeConfig: Record<string, { color: string; icon: React.ElementType }> = {
    course: { color: 'bg-purple-100 text-purple-700 border-purple-200', icon: BookOpen },
    article: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
    video: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: Video },
    project: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Code },
  };

  const config = typeConfig[resource.type] || { color: 'bg-slate-100 text-slate-700 border-slate-200', icon: BookOpen };
  const Icon = config.icon;

  return (
    <div className="relative flex items-start gap-6 group">
      {/* Node indicator */}
      <button
        onClick={() => onToggle(resource.id, resource.completed)}
        disabled={isUpdating}
        className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full shrink-0 bg-white border-[3px] shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-primary/20"
        style={{ borderColor: resource.completed ? 'hsl(var(--primary))' : '#e2e8f0' }}
        aria-label={resource.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {resource.completed ? (
          <CheckCircle2 className="w-6 h-6 text-primary" />
        ) : (
          <span className="text-sm font-bold text-slate-400 group-hover:text-primary transition-colors">{index}</span>
        )}
      </button>
      
      {/* Content Card */}
      <div className={`flex-1 bg-white rounded-xl p-5 md:p-6 shadow-sm border border-slate-200 transition-all duration-300 hover:shadow-md ${resource.completed ? 'opacity-75 bg-slate-50' : ''}`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${config.color}`}>
                <Icon className="w-3.5 h-3.5" />
                {resource.type}
              </span>
              <span className="text-sm font-medium text-slate-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {resource.estimated_hours}h
              </span>
            </div>
            <p className={`text-lg font-bold leading-snug ${resource.completed ? 'text-slate-500 line-through decoration-slate-300 decoration-2' : 'text-slate-900'}`}>
              {resource.title}
            </p>
          </div>
          
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors ${resource.completed ? 'opacity-50' : ''}`}
              aria-label="Open resource"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
