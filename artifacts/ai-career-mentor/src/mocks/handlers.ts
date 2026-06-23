import { http, HttpResponse } from 'msw';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  full_name: 'Test User',
};

const mockTokens = {
  access: 'mock-access-token',
  refresh: 'mock-refresh-token',
};

const mockResumes = [
  {
    id: 'resume-1',
    cloudinary_url: 'https://res.cloudinary.com/demo/raw/upload/resume.pdf',
    cloudinary_public_id: 'resume_1',
    original_filename: 'resume.pdf',
    status: 'parsed',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockResumeAnalysis = {
  id: 'analysis-1',
  resume_id: 'resume-1',
  extracted_skills: ['React', 'TypeScript', 'Node.js', 'Python'],
  extracted_experience: [
    {
      title: 'Senior Frontend Engineer',
      company: 'TechCorp',
      duration: '2022 - Present',
      description: 'Led frontend architecture decisions',
    },
  ],
  summary: 'Experienced frontend engineer with strong React skills',
};

const mockCareerPaths = [
  {
    id: 'path-1',
    title: 'Staff Frontend Engineer',
    description: 'Technical leadership path in frontend engineering',
    reasoning: 'Your strong React and TypeScript skills position you well for staff-level roles. Focus on system design and mentoring.',
    match_score: 92,
    required_skills: ['System Design', 'Mentoring', 'Architecture'],
    timeline_months: 24,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'path-2',
    title: 'Engineering Manager',
    description: 'Management path leading engineering teams',
    reasoning: 'Your experience leading projects shows management potential. Develop people skills and strategic thinking.',
    match_score: 78,
    required_skills: ['People Management', 'Hiring', 'Strategy'],
    timeline_months: 36,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockSkillGap = {
  id: 'gap-1',
  resume_id: 'resume-1',
  target_role: 'Staff Frontend Engineer',
  current_skills: ['React', 'TypeScript', 'Node.js'],
  missing_skills: ['System Design', 'Performance Optimization', 'CI/CD'],
  skill_levels: {
    React: 85,
    TypeScript: 80,
    'Node.js': 70,
    'System Design': 30,
    'Performance Optimization': 40,
    'CI/CD': 50,
  },
  created_at: '2024-01-01T00:00:00Z',
};

const mockJobMatches = [
  {
    id: 'job-1',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    location: 'Remote',
    fit_score: 95,
    match_reasoning: 'Your React and TypeScript expertise directly matches their tech stack. Your experience with design systems aligns with their component library work.',
    salary_range: '$180k - $250k',
    job_url: 'https://stripe.com/jobs',
    status: 'new',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'job-2',
    title: 'Staff Engineer',
    company: 'Vercel',
    location: 'New York, NY',
    fit_score: 88,
    match_reasoning: 'Your frontend expertise and interest in developer tools make you a strong fit for Vercel platform engineering.',
    salary_range: '$200k - $300k',
    job_url: 'https://vercel.com/careers',
    status: 'saved',
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockInterviewSession = {
  id: 'session-1',
  target_role: 'Staff Frontend Engineer',
  status: 'ready',
  questions: [
    {
      id: 'q-1',
      session_id: 'session-1',
      category: 'technical',
      question: 'Design a real-time collaborative text editor. What data structures and algorithms would you use?',
      user_answer: undefined,
      ai_feedback: undefined,
      score: undefined,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'q-2',
      session_id: 'session-1',
      category: 'behavioral',
      question: 'Tell me about a time you had to make a difficult technical decision with incomplete information.',
      user_answer: undefined,
      ai_feedback: undefined,
      score: undefined,
      created_at: '2024-01-01T00:00:00Z',
    },
  ],
  created_at: '2024-01-01T00:00:00Z',
};

const mockRoadmaps = [
  {
    id: 'roadmap-1',
    skill_gap_id: 'gap-1',
    title: 'System Design Mastery',
    description: 'Master system design for frontend applications',
    estimated_hours: 120,
    resources: [
      {
        id: 'res-1',
        roadmap_id: 'roadmap-1',
        title: 'System Design Primer',
        type: 'article',
        url: 'https://example.com/sd',
        estimated_hours: 10,
        completed: true,
        order_index: 0,
      },
      {
        id: 'res-2',
        roadmap_id: 'roadmap-1',
        title: 'Frontend Architecture Course',
        type: 'course',
        url: 'https://example.com/course',
        estimated_hours: 40,
        completed: false,
        order_index: 1,
      },
    ],
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockChatSessions = [
  {
    id: 'chat-1',
    title: 'Career Advice',
    created_at: '2024-01-01T00:00:00Z',
  },
];

const mockChatMessages = [
  {
    id: 'msg-1',
    session_id: 'chat-1',
    role: 'user',
    content: 'Should I specialize in frontend or become full-stack?',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'msg-2',
    session_id: 'chat-1',
    role: 'assistant',
    content: 'Based on your profile, you have strong frontend skills. Specializing could lead to Staff/Principal roles faster, but full-stack opens more startup opportunities.',
    created_at: '2024-01-01T00:01:00Z',
  },
];

export const handlers = [
  // Auth
  http.post(`${API_BASE_URL}/auth/register/`, async () => {
    return HttpResponse.json({ user: mockUser, tokens: mockTokens }, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/auth/login/`, async () => {
    return HttpResponse.json({ user: mockUser, tokens: mockTokens }, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/auth/refresh/`, async () => {
    return HttpResponse.json({ access: 'new-mock-access-token' }, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/auth/logout/`, async () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // Profile
  http.get(`${API_BASE_URL}/me/`, async () => {
    return HttpResponse.json(mockUser, { status: 200 });
  }),

  http.patch(`${API_BASE_URL}/me/`, async () => {
    return HttpResponse.json(mockUser, { status: 200 });
  }),

  // Resumes
  http.post(`${API_BASE_URL}/resumes/`, async () => {
    return HttpResponse.json(mockResumes[0], { status: 201 });
  }),

  http.get(`${API_BASE_URL}/resumes/`, async () => {
    return HttpResponse.json(mockResumes, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/resumes/:id/`, async ({ params }) => {
    const resume = mockResumes.find((r) => r.id === params.id);
    if (!resume) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(resume, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/resumes/:id/analysis/`, async ({ params }) => {
    if (params.id !== 'resume-1') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(mockResumeAnalysis, { status: 200 });
  }),

  // Careers
  http.post(`${API_BASE_URL}/careers/paths/generate/`, async () => {
    return HttpResponse.json({ job_id: 'job-career-1' }, { status: 202 });
  }),

  http.get(`${API_BASE_URL}/careers/paths/`, async () => {
    return HttpResponse.json(mockCareerPaths, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/careers/skill-gaps/:resumeId/`, async () => {
    return HttpResponse.json(mockSkillGap, { status: 200 });
  }),

  // Jobs
  http.post(`${API_BASE_URL}/jobs/matches/generate/`, async () => {
    return HttpResponse.json({ job_id: 'job-match-1' }, { status: 202 });
  }),

  http.get(`${API_BASE_URL}/jobs/matches/`, async () => {
    return HttpResponse.json(mockJobMatches, { status: 200 });
  }),

  http.patch(`${API_BASE_URL}/jobs/matches/:id/`, async ({ request }) => {
    const data = (await request.json()) as { status: string };
    return HttpResponse.json({ ...mockJobMatches[0], status: data.status }, { status: 200 });
  }),

  http.get(`${API_BASE_URL}/jobs/async-status/:jobId/`, async () => {
    return HttpResponse.json({ status: 'done', result: {} }, { status: 200 });
  }),

  // Interviews
  http.post(`${API_BASE_URL}/interviews/sessions/`, async () => {
    return HttpResponse.json(mockInterviewSession, { status: 201 });
  }),

  http.post(`${API_BASE_URL}/interviews/sessions/:id/questions/generate/`, async () => {
    return HttpResponse.json({ job_id: 'job-questions-1' }, { status: 202 });
  }),

  http.get(`${API_BASE_URL}/interviews/sessions/:id/`, async ({ params }) => {
    if (params.id !== 'session-1') return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(mockInterviewSession, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/interviews/questions/:id/answer/`, async () => {
    return HttpResponse.json(
      {
        ai_feedback: 'Good answer. You covered the core concepts well. Consider mentioning operational transforms or CRDTs for the concurrency model.',
        score: 85,
      },
      { status: 200 }
    );
  }),

  // Learning
  http.post(`${API_BASE_URL}/learning/roadmaps/generate/`, async () => {
    return HttpResponse.json({ job_id: 'job-roadmap-1' }, { status: 202 });
  }),

  http.get(`${API_BASE_URL}/learning/roadmaps/`, async () => {
    return HttpResponse.json(mockRoadmaps, { status: 200 });
  }),

  http.patch(`${API_BASE_URL}/learning/resources/:id/`, async ({ request }) => {
    const data = (await request.json()) as { completed: boolean };
    return HttpResponse.json({ ...mockRoadmaps[0].resources[0], completed: data.completed }, { status: 200 });
  }),

  // Chat
  http.post(`${API_BASE_URL}/chat/sessions/`, async () => {
    return HttpResponse.json(mockChatSessions[0], { status: 201 });
  }),

  http.get(`${API_BASE_URL}/chat/sessions/:id/messages/`, async () => {
    return HttpResponse.json(mockChatMessages, { status: 200 });
  }),

  http.post(`${API_BASE_URL}/chat/sessions/:id/messages/`, async () => {
    // SSE streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const tokens = ['Great', ' question!', ' Based', ' on', ' your', ' profile,', ' I', ' recommend', '...'];
        let i = 0;
        const interval = setInterval(() => {
          if (i >= tokens.length) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            clearInterval(interval);
            return;
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: tokens[i] })}\n\n`));
          i++;
        }, 100);
      },
    });

    return new HttpResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }),
];
