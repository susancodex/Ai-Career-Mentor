import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResumeUpload, useResumeDetail, useResumeAnalysis } from '../../hooks/useResumeUpload';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2 } }
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
    uploaded: 'info',
    parsing: 'warning',
    parsed: 'success',
    failed: 'error',
  };
  return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
}

export function ResumePage() {
  const { resumes, isLoading, error, uploadProgress, cloudinaryError, isUploading, uploadFile } = useResumeUpload();
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>(
    resumes[0]?.id
  );

  const resumeDetail = useResumeDetail(selectedResumeId);
  const resumeAnalysis = useResumeAnalysis(
    resumeDetail.data?.status === 'parsed' ? selectedResumeId : undefined
  );

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadFile(acceptedFiles[0]);
      }
    },
    [uploadFile]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Resume</h1>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className="space-y-8 max-w-5xl"
    >
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Resume</h1>

      {/* Upload area */}
      <Card>
        <CardContent className="p-8">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-300 ${
              isDragActive ? 'border-primary bg-primary/5 scale-[1.02]' : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
            }`}
          >
            <input {...getInputProps()} />
            <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors ${isDragActive ? 'bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
              <Upload className="w-8 h-8" />
            </div>
            <p className="text-base font-semibold text-slate-700">
              {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume, or click to browse'}
            </p>
            <p className="text-sm text-slate-500 mt-2">Supports PDF or DOCX, max 5MB</p>
          </div>

          <AnimatePresence>
            {isUploading && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6"
              >
                <div className="flex items-center justify-between text-sm font-medium mb-2">
                  <span className="text-slate-700 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    Uploading and analyzing...
                  </span>
                  <span className="text-primary">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {cloudinaryError && (
            <div className="mt-6 flex items-center gap-2 text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              {cloudinaryError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <EmptyState
          title="No resumes yet"
          message="Upload your resume to get AI-powered career insights and job matches."
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Your Resumes</h2>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid gap-4">
            {resumes.map((resume) => (
              <motion.div variants={itemVariants} key={resume.id}>
                <Card 
                  onClick={() => setSelectedResumeId(resume.id)}
                  className={`cursor-pointer transition-all duration-200 border-2 ${
                    selectedResumeId === resume.id ? 'border-primary ring-4 ring-primary/10' : 'border-transparent hover:border-slate-200'
                  }`}
                >
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-lg">{resume.original_filename}</p>
                        <p className="text-sm text-slate-500 mt-0.5">
                          Uploaded on {new Date(resume.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={resume.status} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {/* Analysis */}
      {resumeDetail.data?.status === 'parsed' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden border-t-4 border-t-primary">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-xl">
                <CheckCircle className="w-6 h-6 text-primary" />
                AI Resume Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-8">
              {resumeAnalysis.isLoading ? (
                <div className="flex items-center justify-center py-12 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-3 text-primary" />
                  <span className="font-medium text-lg">Extracting skills and experience...</span>
                </div>
              ) : resumeAnalysis.error ? (
                <ErrorState message="Failed to load analysis" onRetry={() => resumeAnalysis.refetch()} />
              ) : resumeAnalysis.data ? (
                <>
                  <section>
                    <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-3">Professional Summary</h3>
                    <p className="text-base text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{resumeAnalysis.data.summary}</p>
                  </section>
                  
                  <section>
                    <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-3">Extracted Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {resumeAnalysis.data.extracted_skills.map((skill) => (
                        <Badge key={skill} variant="info" className="px-3 py-1.5 text-sm normal-case tracking-normal">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </section>
                  
                  <section>
                    <h3 className="text-sm font-bold tracking-widest text-slate-400 uppercase mb-4">Experience Timeline</h3>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      {resumeAnalysis.data.extracted_experience.map((exp, i) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-slate-300 group-hover:bg-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 transform -translate-x-1/2 transition-colors"></div>
                          <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 p-5 rounded-xl border border-slate-100 bg-white shadow-sm group-hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                              <h4 className="font-bold text-slate-900 text-lg">{exp.title}</h4>
                              <span className="text-sm font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-md w-fit sm:w-auto mt-2 sm:mt-0">
                                {exp.start_date ?? '?'} – {exp.end_date ?? 'Present'}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-slate-600 mb-3">{exp.company}</p>
                            <p className="text-sm text-slate-500 leading-relaxed">{exp.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </>
              ) : null}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(resumeDetail.data?.status === 'uploaded' || resumeDetail.data?.status === 'parsing') && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6 flex items-center justify-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <p className="font-semibold text-primary text-lg">
              {resumeDetail.data.status === 'uploaded'
                ? 'Resume uploaded successfully. Starting analysis...'
                : 'AI is deeply analyzing your resume structure...'}
            </p>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
