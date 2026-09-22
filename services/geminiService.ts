import { ResumeData, TargetRole, TailoredResume } from '../types';

export interface ApplicationAnswerResponse {
  generated_answer: string;
  confidence_note: string;
  intent_detected: string;
}

export interface CoverLetterResponse {
  content: string;
}

async function handleApiResponse<T>(response: Response, defaultErrorMessage: string): Promise<T> {
  if (!response.ok) {
    let errorDetail = defaultErrorMessage;
    try {
      const errJson = await response.json();
      errorDetail = errJson.error || errJson.message || defaultErrorMessage;
      if (typeof errorDetail === 'string' && errorDetail.trim().startsWith('{')) {
        try {
          const inner = JSON.parse(errorDetail);
          if (inner.error?.message) {
            errorDetail = inner.error.message;
          }
        } catch {}
      }
    } catch {
      // Ignore json parse error and use statusText
      errorDetail = `${defaultErrorMessage} (${response.status} ${response.statusText})`;
    }
    throw new Error(errorDetail);
  }
  return response.json() as Promise<T>;
}

export const generateTailoredResume = async (
  jobDescription: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  jobLink?: string
): Promise<TailoredResume> => {
  const response = await fetch('/api/gemini/tailor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jobDescription,
      targetRole,
      baseResume,
      jobLink,
    }),
  });

  return handleApiResponse<TailoredResume>(
    response,
    'Failed to generate tailored resume with free-tier model'
  );
};

export const optimizeTailoredResume = async (
  currentResume: TailoredResume,
  userPrompt: string
): Promise<TailoredResume> => {
  const response = await fetch('/api/gemini/optimize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      currentResume,
      userPrompt,
    }),
  });

  return handleApiResponse<TailoredResume>(
    response,
    'Failed to optimize resume with free-tier model'
  );
};

export const generateApplicationAnswer = async (
  question: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  wordLimit?: number,
  jobDescription?: string,
  jobLink?: string
): Promise<ApplicationAnswerResponse> => {
  const response = await fetch('/api/gemini/answer-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      targetRole,
      baseResume,
      wordLimit,
      jobDescription,
      jobLink,
    }),
  });

  return handleApiResponse<ApplicationAnswerResponse>(
    response,
    'Failed to generate application answer with free-tier model'
  );
};

export const generateCoverLetter = async (
  companyName: string,
  hiringManager: string,
  targetRole: TargetRole,
  baseResume: ResumeData,
  jobDescription?: string,
): Promise<CoverLetterResponse> => {
  const response = await fetch('/api/gemini/cover-letter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      companyName,
      hiringManager,
      targetRole,
      baseResume,
      jobDescription,
    }),
  });

  return handleApiResponse<CoverLetterResponse>(
    response,
    'Failed to generate cover letter with free-tier model'
  );
};

export const parseResumeFromText = async (text: string): Promise<ResumeData> => {
  const response = await fetch('/api/gemini/parse-resume', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  return handleApiResponse<ResumeData>(
    response,
    'Failed to parse resume text with free-tier model'
  );
};
