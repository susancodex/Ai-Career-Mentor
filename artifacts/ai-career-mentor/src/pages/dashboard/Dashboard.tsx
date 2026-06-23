import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { FileText, Briefcase, MessageSquare, BookOpen, GraduationCap, TrendingUp, Target, Award } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getResumes } from '../../api/resumes';
import { getCareerPaths } from '../../api/careers';
import { getJobMatches } from '../../api/jobs';
import { getRoadmaps } from '../../api/learning';
import { motion } from 'framer-motion';

const quickLinks = [
  { to: '/resume', label: 'Resume', icon: FileText, description: 'Upload your resume for AI analysis' },
  { to: '/careers', label: 'Career Paths', icon: GraduationCap, description: 'Explore AI-recommended career paths' },
  { to: '/jobs', label: 'Job Matches', icon: Briefcase, description: 'See jobs that match your profile' },
  { to: '/interview', label: 'Interview Prep', icon: MessageSquare, description: 'Practice with AI-generated questions' },
  { to: '/learning', label: 'Learning Roadmap', icon: BookOpen, description: 'Follow your personalized learning plan' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

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
    <Card className="h-full">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
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
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Welcome back, {user?.full_name || 'there'}!</h1>
        <p className="text-slate-500 mt-1.5 text-lg">Here's your career progress at a glance.</p>
      </motion.div>

      {/* Stats row */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          label="Resumes"
          value={resumeCount}
          icon={FileText}
          sub={resumeCount === 1 ? 'uploaded' : 'uploaded'}
          color="bg-primary text-primary"
        />
        <StatCard
          label="Career Paths"
          value={pathCount}
          icon={TrendingUp}
          sub={topPath ? `Top: ${topPath.match_score}% match` : 'none yet'}
          color="bg-purple-500 text-purple-500"
        />
        <StatCard
          label="Job Matches"
          value={jobCount}
          icon={Briefcase}
          sub={topJob ? `Best fit: ${topJob.fit_score}%` : 'none yet'}
          color="bg-emerald-500 text-emerald-500"
        />
        <StatCard
          label="Learning"
          value={totalResources > 0 ? `${progressPct}%` : '—'}
          icon={Award}
          sub={totalResources > 0 ? `${completedResources}/${totalResources} done` : 'no roadmap yet'}
          color="bg-amber-500 text-amber-500"
        />
      </motion.div>

      {/* Top matches callout */}
      {(topPath || topJob) && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {topPath && (
            <Link to="/careers" className="block outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className="hover:shadow-md transition-all h-full border-l-4 border-l-purple-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Top Career Path</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{topPath.title}</p>
                  <p className="text-sm text-slate-500 mt-2 line-clamp-2 leading-relaxed">{topPath.description}</p>
                  <span className="inline-flex items-center justify-center mt-4 text-xs font-bold bg-purple-100 text-purple-800 px-3 py-1 rounded-md">
                    {topPath.match_score}% Match
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}
          {topJob && (
            <Link to="/jobs" className="block outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className="hover:shadow-md transition-all h-full border-l-4 border-l-emerald-500">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Best Job Match</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{topJob.title}</p>
                  <p className="text-sm text-slate-500 mt-2 leading-relaxed">{topJob.company} · {topJob.location}</p>
                  <span className="inline-flex items-center justify-center mt-4 text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md">
                    {topJob.fit_score}% Fit
                  </span>
                </CardContent>
              </Card>
            </Link>
          )}
        </motion.div>
      )}

      {/* Quick links */}
      <motion.div variants={itemVariants}>
        <h2 className="text-lg font-bold tracking-tight text-slate-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quickLinks.map((link) => (
            <Link key={link.to} to={link.to} className="group outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
              <Card className="h-full hover:shadow-md transition-all hover:border-primary/20 bg-white">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                      <link.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 group-hover:text-primary transition-colors duration-300">
                        {link.label}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{link.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
