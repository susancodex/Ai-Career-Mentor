import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateRoadmap, getRoadmaps, updateResource } from '../../api/learning';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { BookOpen, CheckCircle, Circle, Clock, ExternalLink, AlertTriangle, Sparkles } from 'lucide-react';
import type { LearningResource } from '../../types';

export function LearningPage() {
  const queryClient = useQueryClient();
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

  const generateMutation = useMutation({
    mutationFn: () => generateRoadmap('gap-1'),
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
        <h1 className="text-2xl font-bold text-gray-900">Learning Roadmap</h1>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Learning Roadmap</h1>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
          isLoading={generateMutation.isPending || isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Roadmap'}
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

      {roadmaps.length === 0 ? (
        <EmptyState
          title="No learning roadmaps yet"
          message="Generate a personalized step-by-step learning plan based on your skill gaps."
          action={
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
              isLoading={generateMutation.isPending || isGenerating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Learning Roadmap'}
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {roadmaps.map((roadmap) => {
            const completed = roadmap.resources.filter((r) => r.completed).length;
            const total = roadmap.resources.length;
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
            return (
              <Card key={roadmap.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-600" />
                        {roadmap.title}
                      </CardTitle>
                      <p className="text-sm text-gray-500 mt-1">{roadmap.description}</p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                        <Clock className="w-4 h-4" />
                        {roadmap.estimated_hours} hours estimated
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-500">
                      <span className="font-semibold text-gray-900">{pct}%</span> complete
                      <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-green-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    <div className="space-y-4">
                      {roadmap.resources
                        .slice()
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((resource) => (
                          <ResourceItem
                            key={resource.id}
                            resource={resource}
                            onToggle={handleToggle}
                            isUpdating={updateMutation.isPending}
                          />
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResourceItem({
  resource,
  onToggle,
  isUpdating,
}: {
  resource: LearningResource;
  onToggle: (id: string, completed: boolean) => void;
  isUpdating: boolean;
}) {
  const typeColors: Record<string, string> = {
    course: 'bg-purple-100 text-purple-800',
    article: 'bg-green-100 text-green-800',
    video: 'bg-red-100 text-red-800',
    project: 'bg-orange-100 text-orange-800',
  };

  return (
    <div className="relative flex items-start gap-4 pl-2">
      <button
        onClick={() => onToggle(resource.id, resource.completed)}
        disabled={isUpdating}
        className="relative z-10 mt-0.5"
        aria-label={resource.completed ? 'Mark as incomplete' : 'Mark as complete'}
      >
        {resource.completed ? (
          <CheckCircle className="w-6 h-6 text-green-600" />
        ) : (
          <Circle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
        )}
      </button>
      <div className={`flex-1 bg-gray-50 rounded-lg p-4 ${resource.completed ? 'opacity-60' : ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeColors[resource.type] || 'bg-gray-100 text-gray-800'}`}>
                {resource.type}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {resource.estimated_hours}h
              </span>
            </div>
            <p className={`font-medium ${resource.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
              {resource.title}
            </p>
          </div>
          {resource.url && (
            <a
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 ml-2"
              aria-label="Open resource"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
