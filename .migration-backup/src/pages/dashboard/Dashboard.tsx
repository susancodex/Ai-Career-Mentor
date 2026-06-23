import { useAuth } from '../../hooks/useAuth';
import { Card, CardContent } from '../../components/ui/Card';
import { FileText, Briefcase, MessageSquare, BookOpen, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

const quickLinks = [
  { to: '/resume', label: 'Resume', icon: FileText, description: 'Upload your resume for AI analysis' },
  { to: '/careers', label: 'Career Paths', icon: GraduationCap, description: 'Explore AI-recommended career paths' },
  { to: '/jobs', label: 'Job Matches', icon: Briefcase, description: 'See jobs that match your profile' },
  { to: '/interview', label: 'Interview Prep', icon: MessageSquare, description: 'Practice with AI-generated questions' },
  { to: '/learning', label: 'Learning Roadmap', icon: BookOpen, description: 'Follow your personalized learning plan' },
];

export function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.full_name || 'there'}!</h1>
        <p className="text-gray-500 mt-1">Here's what you can do today to advance your career.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="group"
          >
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
  );
}
