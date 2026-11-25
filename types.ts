
export enum TargetRole {
  CLOUD_SECURITY = 'Cloud Security Engineer',
  CLOUD_ENGINEER = 'Cloud Engineer',
  DEVSECOPS = 'DevSecOps Engineer',
  IAM_ENGINEER = 'IAM Engineer',
  DEVOPS_ENGINEER = 'DevOps Engineer',
  AWS_CLOUD_ENGINEER = 'AWS Cloud Engineer',
  AZURE_CLOUD_ENGINEER = 'Azure Cloud Engineer',
  CLOUD_SOLUTION_ARCHITECT = 'Cloud Solution Architect',
  AZURE_CLOUD_ARCHITECT = 'Azure Cloud Architect',
  SITE_RELIABILITY_ENGINEER = 'Site Reliability Engineer',
  SOFTWARE_ENGINEER = 'Software Engineer'
}

export interface WorkExperience {
  company: string;
  role: string;
  duration: string;
  bullets: string[];
}

export interface ResumeData {
  name: string;
  contact: {
    location: string;
    email: string;
    phone: string;
    linkedin: string;
  };
  summary: string;
  skills: string[];
  certifications: string[];
  education: string[];
  experience: WorkExperience[];
}

export interface UsageMetadata {
  task:
    | 'tailor-resume'
    | 'optimize-resume'
    | 'application-answer'
    | 'cover-letter'
    | 'parse-resume'
    | 'gap-analysis';
  model: string;
  costProfile: 'eco' | 'hybrid';
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  totalTokenCount: number;
  estimatedCostUsd: number;
  latencyMs: number;
}

export interface UsageRecord extends UsageMetadata {
  id: string;
  timestamp: number;
  targetRole?: string;
}

export interface GapAnalysisMissingItem {
  term: string;
  category: string;
  priority: 'Critical' | 'High' | 'Recommended';
  jdEvidence: string;
  suggestedPlacement: 'Summary' | 'Skills' | 'Experience' | 'Certifications';
  actionTip: string;
}

export interface GapAnalysisUnderrepresentedItem {
  term: string;
  currentLocation: string;
  recommendation: string;
}

export interface GapAnalysisResult {
  overallCoverageScore: number;
  executiveSummary: string;
  missingKeywords: GapAnalysisMissingItem[];
  underrepresentedSkills: GapAnalysisUnderrepresentedItem[];
  strongMatches: string[];
  _usage?: UsageMetadata;
}

export interface TailoredResume {
  summary: string;
  skills: string[];
  certifications: string[];
  education: string[];
  experience: WorkExperience[];
  analysis: {
    matchScore: number;
    keywordsUsed: string[];
    toneNotes: string;
  };
  _usage?: UsageMetadata;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  targetRole: TargetRole;
  jobDescription: string;
  jobLink?: string;
  tailoredResume: TailoredResume;
}