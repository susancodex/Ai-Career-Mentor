import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generateCareerPaths, getCareerPaths, getSkillGaps } from '../../api/careers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { TrendingUp, Target, AlertTriangle, Sparkles } from 'lucide-react';

export function CareersPage() {
  const queryClient = useQueryClient();
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = setInterval(() => setRetryAfter((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [retryAfter]);

  const pathsQuery = useQuery({
    queryKey: ['career-paths'],
    queryFn: getCareerPaths,
    staleTime: 60 * 1000,
    refetchInterval: isGenerating ? 3000 : false,
    refetchIntervalInBackground: false,
  });

  const skillGapQuery = useQuery({
    queryKey: ['skill-gaps', 'resume-1'],
    queryFn: () => getSkillGaps('resume-1'),
    enabled: pathsQuery.isSuccess,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateCareerPaths('resume-1'),
    onMutate: () => {
      setRateLimitError(null);
      setIsGenerating(true);
    },
    onSuccess: () => {
      setTimeout(() => {
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ['career-paths'] });
        queryClient.invalidateQueries({ queryKey: ['skill-gaps', 'resume-1'] });
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

  if (pathsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Career Paths</h1>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (pathsQuery.error) {
    return <ErrorState onRetry={() => pathsQuery.refetch()} />;
  }

  const paths = pathsQuery.data || [];
  const skillGap = skillGapQuery.data;

  const radarData = skillGap
    ? Object.entries(skillGap.skill_levels).map(([skill, level]) => ({
        skill,
        level,
        fullMark: 100,
      }))
    : [];

  const barData = paths.map((path) => ({
    name: path.title,
    score: path.match_score,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Career Paths</h1>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
          isLoading={generateMutation.isPending || isGenerating}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Paths'}
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

      {/* Skill Gap Visualization */}
      {skillGap && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Skill Gap Analysis
            </CardTitle>
            <CardDescription>Target role: {skillGap.target_role}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar
                    name="Current Level"
                    dataKey="level"
                    stroke="#2563eb"
                    fill="#2563eb"
                    fillOpacity={0.3}
                  />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <div>
                <span className="text-sm font-medium text-gray-700">Missing skills: </span>
                {skillGap.missing_skills.map((skill) => (
                  <Badge key={skill} variant="warning" className="mr-1">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Match Score Chart */}
      {paths.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Path Match Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Career Path Cards */}
      {paths.length === 0 ? (
        <EmptyState
          title="No career paths yet"
          message="Click Generate Paths to get AI-powered career recommendations based on your resume."
          action={
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
              isLoading={generateMutation.isPending || isGenerating}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Career Paths'}
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Recommended Paths</h2>
          <div className="grid gap-4">
            {paths.map((path) => (
              <Card key={path.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{path.title}</h3>
                      <p className="text-sm text-gray-500">{path.description}</p>
                    </div>
                    <Badge variant="success">{path.match_score}% match</Badge>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-900">
                      <span className="font-medium">Why this fits: </span>
                      {path.reasoning}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-gray-600">Required skills:</span>
                    {path.required_skills.map((skill) => (
                      <Badge key={skill} variant="info">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Estimated timeline: {path.timeline_months} months
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
