import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRoadmaps, updateResource } from '../../api/learning';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { BookOpen, CheckCircle, Circle, Clock, ExternalLink } from 'lucide-react';
import type { LearningResource } from '../../types';

export function LearningPage() {
  const queryClient = useQueryClient();
  const roadmapsQuery = useQuery({
    queryKey: ['learning-roadmaps'],
    queryFn: getRoadmaps,
    staleTime: 60 * 1000,
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
      <h1 className="text-2xl font-bold text-gray-900">Learning Roadmap</h1>

      {roadmaps.length === 0 ? (
        <EmptyState
          title="No learning roadmaps yet"
          message="Generate a personalized learning roadmap based on your skill gaps."
        />
      ) : (
        <div className="space-y-6">
          {roadmaps.map((roadmap) => (
            <Card key={roadmap.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-600" />
                  {roadmap.title}
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">{roadmap.description}</p>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  {roadmap.estimated_hours} hours estimated
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                  <div className="space-y-4">
                    {roadmap.resources.map((resource) => (
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
          ))}
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
              className="text-blue-600 hover:text-blue-700"
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
