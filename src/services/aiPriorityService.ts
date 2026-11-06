import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ComplaintPriorityInput {
  complaint_id?: string;
  title: string;
  description: string;
  category?: string;
  location?: string;
  ward?: string;
  people_affected?: number | string;
  submission_date?: string;
  status?: string;
}

export interface PriorityResult {
  numeric_priority: 1 | 2 | 3 | 4 | 5;
  priority_level: 'Critical' | 'High' | 'Medium' | 'Low';
  label: string;
  description: string;
  source: 'gemini' | 'fallback';
  raw_response?: string;
}

/**
 * Calculates priority integer (1..5) using Gemini (gemini-3.1-flash-lite)
 * following the GramVani Community Problem Reporting priority prompt.
 */
export async function calculateComplaintPriority(input: ComplaintPriorityInput): Promise<PriorityResult> {
  const complaintId = input.complaint_id || 'PENDING-SUBMISSION';
  const title = input.title || 'Untitled Complaint';
  const description = input.description || 'No description provided.';
  const category = input.category || 'General';
  const location = input.location || 'Municipal Area';
  const ward = input.ward || 'General Ward';
  const peopleAffected = input.people_affected ?? 'Unspecified (Local Community)';
  const submissionDate = input.submission_date || new Date().toISOString().split('T')[0];
  const status = input.status || 'SUBMITTED_UNVERIFIED';

  const prompt = `You are an AI-based Community Complaint Priority Classification System for GramVani – Community Problem Reporting and Resolution Platform.
Your task is to analyse the submitted community complaint and assign exactly ONE priority number between 1 and 5.
PRIORITY LEVELS:
1 = HIGHEST PRIORITY (CRITICAL)
Life-threatening situations, serious health risks, contaminated drinking water, dangerous electrical faults, major accidents, severe flooding and emergency situations.
2 = VERY HIGH PRIORITY
Major water shortages, serious sanitation problems, dangerous road damage, large-scale electricity failures and problems affecting essential public services.
3 = HIGH PRIORITY
Damaged roads, regular water supply issues, garbage accumulation, broken streetlights, drainage problems and significant community inconveniences.
4 = MEDIUM PRIORITY
Agriculture and economic development requests, minor infrastructure repairs, public facility improvements and moderate community problems.
5 = LOWEST PRIORITY
Village beautification, park improvements, benches, minor suggestions, general development ideas and non-urgent requests.
ANALYSIS RULES:
Analyse the complete complaint title and description.
Consider problem severity.
Consider public health and safety risks.
Consider the number of people affected.
Consider the importance of the affected public service.
Consider how long the complaint has remained unresolved.
Give higher priority to problems affecting essential services and larger communities.
A life-threatening emergency must always receive Priority 1.
Do not assign priority based only on the complaint category.
Do not give higher priority simply because a complaint uses emotional language.
If information is missing, make a conservative assessment without inventing facts.
Every complaint must receive exactly one priority number.
OUTPUT REQUIREMENT:
Return ONLY ONE INTEGER:
1
2
3
4
or
5
DO NOT return:
Explanations
Priority labels
Scores
JSON
Sentences
Additional text
Markdown formatting
Your final response must contain exactly one number.
COMPLAINT DETAILS:
Complaint ID: ${complaintId}
Title: ${title}
Description: ${description}
Category: ${category}
Location: ${location}
Ward: ${ward}
People Affected: ${peopleAffected}
Submission Date: ${submissionDate}
Status: ${status}
Analyse the complaint and return only its priority number.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const textOutput = (response.text || '').trim();
    const match = textOutput.match(/\b([1-5])\b/);
    if (match) {
      const num = parseInt(match[1], 10) as 1 | 2 | 3 | 4 | 5;
      return formatPriorityResult(num, 'gemini', textOutput);
    }
  } catch (error) {
    console.warn('Gemini priority classification call failed or fallback used:', error);
  }

  // Fallback heuristic if API fails or API key missing
  const textLower = `${title} ${description}`.toLowerCase();
  let num: 1 | 2 | 3 | 4 | 5 = 3;
  if (/life[- ]threatening|shock|exposed wire|poison|contamination|collapse|emergency|fire|sinkhole/i.test(textLower)) {
    num = 1;
  } else if (/sewage|burst|outage|major|water shortage|danger/i.test(textLower)) {
    num = 2;
  } else if (/pothole|garbage|broken streetlight|drain/i.test(textLower)) {
    num = 3;
  } else if (/bench|park|beautification|tree trim|suggestion/i.test(textLower)) {
    num = 5;
  } else {
    num = 4;
  }

  return formatPriorityResult(num, 'fallback');
}

export function formatPriorityResult(
  num: 1 | 2 | 3 | 4 | 5,
  source: 'gemini' | 'fallback',
  rawResponse?: string
): PriorityResult {
  const priorityMap: Record<1 | 2 | 3 | 4 | 5, { level: 'Critical' | 'High' | 'Medium' | 'Low'; label: string; desc: string }> = {
    1: {
      level: 'Critical',
      label: '1 - Highest Priority (Critical)',
      desc: 'Life-threatening situations, serious health risks, contaminated drinking water, dangerous electrical faults.',
    },
    2: {
      level: 'Critical',
      label: '2 - Very High Priority',
      desc: 'Major water shortages, serious sanitation problems, dangerous road damage, large-scale electricity failures.',
    },
    3: {
      level: 'High',
      label: '3 - High Priority',
      desc: 'Damaged roads, regular water supply issues, garbage accumulation, broken streetlights, drainage problems.',
    },
    4: {
      level: 'Medium',
      label: '4 - Medium Priority',
      desc: 'Agriculture and economic development requests, minor infrastructure repairs, public facility improvements.',
    },
    5: {
      level: 'Low',
      label: '5 - Lowest Priority',
      desc: 'Village beautification, park improvements, benches, minor suggestions, general development ideas.',
    },
  };

  const info = priorityMap[num];
  return {
    numeric_priority: num,
    priority_level: info.level,
    label: info.label,
    description: info.desc,
    source,
    raw_response: rawResponse,
  };
}
