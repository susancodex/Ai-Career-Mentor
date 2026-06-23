import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { FileText, Briefcase, MessageSquare, BookOpen, GraduationCap, TrendingUp, Target, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getResumes } from '../../api/resumes';
import { getCareerPaths } from '../../api/careers';
import { getJobMatches } from '../../api/jobs';
import { getRoadmaps } from '../../api/learning';

const quickLinks = [
  { to: '/resume', label: 'Resume', icon: FileText, description: 'Upload your resume for AI analysis' },
  { to: '/careers', label: 'Career Paths', icon: GraduationCap, description: 'Explore AI-recommended career paths' },
  { to: '/jobs', label: 'Job Matches', icon: Briefcase, description: 'See jobs that match your profile' },
  { to: '/interview', label: 'Interview Prep', icon: MessageSquare, description: 'Practice with AI-generated questions' },
  { to: '/learning', label: 'Learning Roadmap', icon: BookOpen, description: 'Follow your personalized learning plan' },
];

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { user } = useAuth();

  const resumesQuery = useQuery({ queryKey: ['resumes'], queryFn: getResumes, staleTime: 60_000 });
  const pathsQuery = useQuery({ queryKey: ['career-paths'], queryFn: getCareerPaths, staleTime: 60_000 });
  const jobsQuery = useQuery({ queryKey: ['job-matches'], queryFn: getJobMatches, staleTime: 60_000 });
  const roadmapsQuery = useQuery({ queryKey: ['learning-roadmaps'], queryFn: getRoadmaps, staleTime: 60_000 });

  const resumeCount = resumesQuery.data?.length ?? 0;
  const pathCount = pathsQuery.data?.length ?? 0;
  const jobCount = jobsQuery.data?.length ?? 0;

  const allResources = roadmapsQuery.data?.flatMap((r) => r.resources) ?? [];
  const completedResources = allResources.filter((r) => r.completed).length;
  const totalResources = allResources.length;
  const progressPct = totalResources > 0 ? Math.round((completedResources / totalResources) * 100) : 0;

  const topJob = jobsQuery.data?.sort((a, b) => b.fit_score - a.fit_score)[0];
  const topPath = pathsQuery.data?.sort((a, b) => b.match_score - a.match_score)[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.full_name || 'there'}!</h1>
        <p className="text-gray-500 mt-1">Here's your career progress at a glance.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Resumes"
          value={resumeCount}
          icon={FileText}
          sub={resumeCount === 1 ? 'uploaded' : 'uploaded'}
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Career Paths"
          value={pathCount}
          icon={TrendingUp}
          sub={topPath ? `Top: ${topPath.match_score}% match` : 'none yet'}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Job Matches"
          value={jobCount}
          icon={Briefcase}
          sub={topJob ? `Best fit: ${topJob.fit_score}%` : 'none yet'}
          color="bg-green-50 text-green-600"
        />
        <StatCard
          label="Learning"
          value={totalResources > 0 ? `${progressPct}%` : '—'}
          icon={Award}
          sub={totalResources > 0 ? `${completedResources}/${totalResources} done` : 'no roadmap yet'}
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Top matches callout */}
      {(topPath || topJob) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topPath && (
            <Link to="/careers">
              <Card className="hover:shadow-md transition-shadow border-l-4 border-l-purple-500">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Top Career Path</span>
                  </div>
                  <p className="font-semibold text-gray-900">{topPath.title}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{topPath.description}</p>
                  <span className="inline-block mt-2 text-xs font-medium bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                    {topPath.match_score}% match
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}
          {topJob && (
            <Link to="/jobs">
              <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Best Job Match</span>
                  </div>
                  <p className="font-semibold text-gray-900">{topJob.title}</p>
                  <p className="text-sm text-gray-500 mt-1">{topJob.company} · {topJob.location}</p>
                  <span className="inline-block mt-2 text-xs font-medium bg-green-100 text-green-800 px-2 py-0.5 rounded-full">
                    {topJob.fit_score}% fit
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="group">
              <Card className="h-full hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 group-hover:bg-blue-100 transition-colors">
                      <link.icon className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {link.label}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{link.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
