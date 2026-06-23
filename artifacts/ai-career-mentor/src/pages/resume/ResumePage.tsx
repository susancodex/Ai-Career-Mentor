import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileText, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useResumeUpload, useResumeDetail, useResumeAnalysis } from '../../hooks/useResumeUpload';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';

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
        <h1 className="text-2xl font-bold text-gray-900">Resume</h1>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return <ErrorState onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Resume</h1>

      {/* Upload area */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700">
              {isDragActive ? 'Drop your resume here' : 'Drag & drop your resume, or click to browse'}
            </p>
            <p className="text-xs text-gray-500 mt-1">PDF or DOCX, max 5MB</p>
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Uploading...</span>
                <span className="font-medium text-gray-900">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {cloudinaryError && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="w-4 h-4" />
              {cloudinaryError}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resume list */}
      {resumes.length === 0 ? (
        <EmptyState
          title="No resumes yet"
          message="Upload your resume to get AI-powered career insights."
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Your Resumes</h2>
          <div className="grid gap-4">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className={`bg-white rounded-xl shadow-sm border p-4 cursor-pointer transition-all ${
                  selectedResumeId === resume.id ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200 hover:shadow-md'
                }`}
                onClick={() => setSelectedResumeId(resume.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{resume.original_filename}</p>
                      <p className="text-xs text-gray-500">
                        Uploaded {new Date(resume.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={resume.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analysis */}
      {resumeDetail.data?.status === 'parsed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resumeAnalysis.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading analysis...
              </div>
            ) : resumeAnalysis.error ? (
              <ErrorState message="Failed to load analysis" onRetry={() => resumeAnalysis.refetch()} />
            ) : resumeAnalysis.data ? (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
                  <p className="text-sm text-gray-600">{resumeAnalysis.data.summary}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Extracted Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {resumeAnalysis.data.extracted_skills.map((skill) => (
                      <Badge key={skill} variant="info">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Experience</h3>
                  <div className="space-y-3">
                    {resumeAnalysis.data.extracted_experience.map((exp, i) => (
                      <div key={i} className="bg-gray-50 rounded-lg p-3">
                        <p className="font-medium text-gray-900">{exp.title}</p>
                        <p className="text-sm text-gray-600">
                          {exp.company} · {exp.duration}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">{exp.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
      )}

      {(resumeDetail.data?.status === 'uploaded' || resumeDetail.data?.status === 'parsing') && (
        <Card>
          <CardContent className="p-6 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-sm text-gray-600">
              {resumeDetail.data.status === 'uploaded'
                ? 'Resume uploaded. Parsing in progress...'
                : 'AI is analyzing your resume...'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
