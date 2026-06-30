import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { generateCareerPaths, getCareerPaths, getSkillGaps } from '../../api/careers';
import { useResumeUpload } from '../../hooks/useResumeUpload';
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
import { TrendingUp, Target, AlertTriangle, Sparkles, Briefcase, GraduationCap } from 'lucide-react';

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

export function CareersPage() {
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

  const pathsQuery = useQuery({
    queryKey: ['career-paths'],
    queryFn: getCareerPaths,
    staleTime: 60 * 1000,
    refetchInterval: isGenerating ? 3000 : false,
    refetchIntervalInBackground: false,
  });

  const skillGapQuery = useQuery({
    queryKey: ['skill-gaps', selectedResumeId],
    queryFn: () => getSkillGaps(selectedResumeId),
    enabled: pathsQuery.isSuccess && !!selectedResumeId,
  });

  const generateMutation = useMutation({
    mutationFn: () => generateCareerPaths(selectedResumeId),
    onMutate: () => {
      setRateLimitError(null);
      setIsGenerating(true);
    },
    onSuccess: () => {
      setTimeout(() => {
        setIsGenerating(false);
        queryClient.invalidateQueries({ queryKey: ['career-paths'] });
        queryClient.invalidateQueries({ queryKey: ['skill-gaps', selectedResumeId] });
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
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Career Paths</h1>
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
    <motion.div 
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className="space-y-8 max-w-6xl"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Career Paths</h1>
          <p className="text-slate-500 mt-1 text-lg">AI-recommended trajectories based on your profile.</p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending || isGenerating || retryAfter > 0}
          isLoading={generateMutation.isPending || isGenerating}
          size="lg"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          {retryAfter > 0 ? `Retry in ${retryAfter}s` : 'Generate Paths'}
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

      {paths.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Skill Gap Visualization */}
          {skillGap && (
            <motion.div variants={itemVariants}>
              <Card className="h-full flex flex-col">
                <CardHeader className="bg-slate-50 border-b border-slate-100">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="w-5 h-5 text-primary" />
                    Skill Gap Analysis
                  </CardTitle>
                  <CardDescription className="font-medium text-slate-600">Target role: <span className="text-slate-900 font-bold">{skillGap.target_role}</span></CardDescription>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <div className="h-[300px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8' }} />
                        <Radar
                          name="Current Level"
                          dataKey="level"
                          stroke="hsl(var(--primary))"
                          fill="hsl(var(--primary))"
                          fillOpacity={0.4}
                          strokeWidth={2}
                        />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-auto pt-6 border-t border-slate-100">
                    <p className="text-sm font-bold text-slate-900 mb-3">Critical skills to develop:</p>
                    <div className="flex flex-wrap gap-2">
                      {skillGap.missing_skills.map((skill) => (
                        <Badge key={skill} variant="warning" className="px-2.5 py-1 text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Match Score Chart */}
          <motion.div variants={itemVariants}>
            <Card className="h-full flex flex-col">
              <CardHeader className="bg-slate-50 border-b border-slate-100">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Path Viability Scores
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-center">
                <div className="h-[350px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis dataKey="name" type="category" width={140} tick={{ fill: '#334155', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <Bar dataKey="score" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
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
        <div className="space-y-6 pt-4">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Recommended Paths</h2>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-6">
            {paths.map((path) => (
              <motion.div variants={itemVariants} key={path.id}>
                <Card className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary group">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <Briefcase className="w-5 h-5" />
                          </div>
                          <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">{path.title}</h3>
                        </div>
                        <p className="text-base text-slate-600 leading-relaxed max-w-3xl pl-13">{path.description}</p>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-13 md:pl-0">
                        <span className="text-3xl font-black text-primary">{path.match_score}%</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mt-1">Profile Match</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 mb-6 md:ml-13">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="font-bold text-slate-900">Why this fits you</span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {path.reasoning}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 md:ml-13">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <span className="text-sm font-bold text-slate-900">Required Skills:</span>
                        <div className="flex flex-wrap gap-2">
                          {path.required_skills.map((skill) => (
                            <Badge key={skill} variant="default" className="bg-white border-slate-200 shadow-sm">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg shrink-0 w-fit">
                        <GraduationCap className="w-4 h-4 text-slate-500" />
                        Est. {path.timeline_months} months
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
