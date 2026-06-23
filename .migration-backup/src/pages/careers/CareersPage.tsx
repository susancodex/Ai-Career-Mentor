import { useQuery } from '@tanstack/react-query';
import { getCareerPaths, getSkillGaps } from '../../api/careers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Target } from 'lucide-react';

export function CareersPage() {
  const pathsQuery = useQuery({
    queryKey: ['career-paths'],
    queryFn: getCareerPaths,
    staleTime: 60 * 1000,
  });

  const skillGapQuery = useQuery({
    queryKey: ['skill-gaps', 'resume-1'],
    queryFn: () => getSkillGaps('resume-1'),
    enabled: pathsQuery.isSuccess,
  });

  if (pathsQuery.isLoading || skillGapQuery.isLoading) {
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
      <h1 className="text-2xl font-bold text-gray-900">Career Paths</h1>

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
          message="Upload your resume to generate personalized career path recommendations."
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
