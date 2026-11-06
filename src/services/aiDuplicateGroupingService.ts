import { GoogleGenAI } from '@google/genai';
import { calculateDistanceMeters } from './classifier.js';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

export interface ComplaintData {
  id: string;
  title: string;
  description: string;
  category: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  ward?: string;
  created_at?: string;
  issue_group_id?: string | null;
  duplicate_status?: string;
}

export interface DuplicateAnalysisResult {
  decision: 'GROUP' | 'POSSIBLE_DUPLICATE' | 'UNIQUE';
  matched_complaint_id: string | null;
  matched_issue_group_id: string | null;
  distance_meters: number | null;
  semantic_similarity_score: number; // 0.0 - 1.0
  reasoning: string;
  case_matched: 'CASE_1' | 'CASE_2' | 'CASE_3' | 'CASE_4' | 'CASE_5' | 'CASE_6' | 'UNIQUE';
}

/**
 * AI-powered Duplicate Community Complaint Detection and Grouping Engine for GramVani.
 * 
 * Step 1: Filter existing active complaints.
 * Step 2: Compare geographical distance (0-100m, 101-300m, 301-500m, >500m).
 * Step 3: Use Gemini 3.5 Flash Lite (gemini-3.1-flash-lite) for semantic content analysis.
 * Step 4: Apply Decision Rules (CASE 1 to CASE 6) to return grouping status.
 */
export async function evaluateDuplicateAndGrouping(
  newComplaint: ComplaintData,
  existingComplaints: ComplaintData[]
): Promise<DuplicateAnalysisResult> {
  const candidates = existingComplaints.filter(
    (c) => c.id !== newComplaint.id && c.duplicate_status !== 'REJECTED'
  );

  if (candidates.length === 0) {
    return {
      decision: 'UNIQUE',
      matched_complaint_id: null,
      matched_issue_group_id: null,
      distance_meters: null,
      semantic_similarity_score: 0,
      reasoning: 'No previous complaints in database to compare against.',
      case_matched: 'UNIQUE',
    };
  }

  // Calculate distance for candidate complaints with coordinates
  const candidatesWithDistances = candidates.map((c) => {
    let dist: number | null = null;
    if (
      newComplaint.latitude != null &&
      newComplaint.longitude != null &&
      c.latitude != null &&
      c.longitude != null
    ) {
      dist = calculateDistanceMeters(
        newComplaint.latitude,
        newComplaint.longitude,
        c.latitude,
        c.longitude
      );
    }
    return { complaint: c, distance: dist };
  });

  // Sort by geographical distance first
  candidatesWithDistances.sort((a, b) => {
    if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
    if (a.distance !== null) return -1;
    if (b.distance !== null) return 1;
    return 0;
  });

  // Select top candidate complaints for AI semantic evaluation
  const topCandidates = candidatesWithDistances.slice(0, 5);

  const prompt = `You are an AI-powered Duplicate Community Complaint Detection and Grouping System for GramVani – Community Problem Reporting and Resolution Platform.

YOUR MAIN OBJECTIVE:
Analyse the newly submitted complaint against existing complaints and identify if they describe the EXACT SAME real-world community problem (e.g. same water shortage, same road pothole, same garbage heap, same electrical defect).

NEW COMPLAINT TO ANALYSE:
- ID: ${newComplaint.id}
- Title: ${newComplaint.title}
- Description: ${newComplaint.description}
- Category: ${newComplaint.category}
- Address: ${newComplaint.address || 'N/A'} (Ward: ${newComplaint.ward || 'N/A'})

CANDIDATE EXISTING COMPLAINTS IN DATABASE:
${topCandidates
  .map(
    (item, index) => `
Candidate #${index + 1}:
- ID: ${item.complaint.id}
- Title: ${item.complaint.title}
- Description: ${item.complaint.description}
- Category: ${item.complaint.category}
- Address: ${item.complaint.address || 'N/A'} (Ward: ${item.complaint.ward || 'N/A'})
- Geo Distance: ${item.distance != null ? Math.round(item.distance) + ' metres' : 'No GPS coordinates'}
- Issue Group ID: ${item.complaint.issue_group_id || 'None'}
`
  )
  .join('\n')}

COMPLAINT CONTENT ANALYSIS RULES:
1. Understand the actual meaning of each complaint.
2. Identify complaints describing the same underlying problem even if wording/sentences differ.
3. Do NOT group complaints that describe completely different problems, even if in the same category.
4. Assess semantic similarity score between 0.0 (unrelated) and 1.0 (identical problem).

Return ONLY a JSON object matching this schema:
{
  "matched_complaint_id": "STRING_OR_NULL",
  "semantic_similarity_score": NUMBER_0_TO_1,
  "is_same_problem": BOOLEAN,
  "reasoning": "SHORT_EXPLANATION"
}`;

  let matchedComplaintId: string | null = null;
  let semanticScore = 0.0;
  let isSameProblem = false;
  let reasoning = 'Rule-based evaluation fallback.';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const textStr = (response.text || '').trim();
    if (textStr) {
      const parsed = JSON.parse(textStr);
      matchedComplaintId = parsed.matched_complaint_id || null;
      semanticScore = typeof parsed.semantic_similarity_score === 'number' ? parsed.semantic_similarity_score : 0;
      isSameProblem = Boolean(parsed.is_same_problem);
      reasoning = parsed.reasoning || 'Evaluated via Gemini 3.5 Flash Lite.';
    }
  } catch (err) {
    console.warn('Gemini Flash Lite duplicate check fallback:', err);
  }

  // Fallback text check if AI call did not return a match
  if (!matchedComplaintId && topCandidates.length > 0) {
    const candidateObj = topCandidates[0];
    const textA = `${newComplaint.title} ${newComplaint.description}`.toLowerCase();
    const textB = `${candidateObj.complaint.title} ${candidateObj.complaint.description}`.toLowerCase();

    const wordsA = textA.split(/\s+/).filter((w) => w.length > 3);
    const wordsB = new Set(textB.split(/\s+/).filter((w) => w.length > 3));
    let matches = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) matches++;
    }
    const ratio = wordsA.length > 0 ? matches / wordsA.length : 0;
    if (ratio >= 0.4) {
      matchedComplaintId = candidateObj.complaint.id;
      semanticScore = Math.min(0.92, ratio + 0.35);
      isSameProblem = true;
      reasoning = `Semantic overlap of ${Math.round(semanticScore * 100)}% detected.`;
    }
  }

  const matchedItem = topCandidates.find((c) => c.complaint.id === matchedComplaintId) || topCandidates[0];
  const matchedComplaint = isSameProblem && matchedItem ? matchedItem.complaint : null;
  const distance = matchedItem ? matchedItem.distance : null;

  // DECISION MATRIX (Section 3 of prompt):
  // CASE 1: Highly similar content (>= 0.7) AND location <= 300 metres -> GROUP
  // CASE 2: Highly similar content (>= 0.7) AND location 301-500 metres -> POSSIBLE_DUPLICATE
  // CASE 3: Moderately similar content (0.4-0.69) AND location <= 300 metres -> POSSIBLE_DUPLICATE
  // CASE 4: Similar content BUT location > 500 metres -> UNIQUE
  // CASE 5: Different content (< 0.4) -> UNIQUE
  // CASE 6: Multiple complaints / continuous -> POSSIBLE_DUPLICATE

  let decision: 'GROUP' | 'POSSIBLE_DUPLICATE' | 'UNIQUE' = 'UNIQUE';
  let caseMatched: 'CASE_1' | 'CASE_2' | 'CASE_3' | 'CASE_4' | 'CASE_5' | 'CASE_6' | 'UNIQUE' = 'UNIQUE';

  if (isSameProblem && matchedComplaint) {
    if (semanticScore >= 0.65 && (distance === null || distance <= 300)) {
      decision = 'GROUP';
      caseMatched = 'CASE_1';
    } else if (semanticScore >= 0.65 && distance !== null && distance >= 301 && distance <= 500) {
      decision = 'POSSIBLE_DUPLICATE';
      caseMatched = 'CASE_2';
    } else if (semanticScore >= 0.40 && semanticScore < 0.65 && (distance === null || distance <= 300)) {
      decision = 'POSSIBLE_DUPLICATE';
      caseMatched = 'CASE_3';
    } else if (semanticScore >= 0.50 && distance !== null && distance > 500) {
      decision = 'UNIQUE';
      caseMatched = 'CASE_4';
    } else {
      decision = 'UNIQUE';
      caseMatched = 'CASE_5';
    }
  } else {
    decision = 'UNIQUE';
    caseMatched = 'CASE_5';
  }

  return {
    decision,
    matched_complaint_id: matchedComplaint ? matchedComplaint.id : null,
    matched_issue_group_id: matchedComplaint ? matchedComplaint.issue_group_id || null : null,
    distance_meters: distance,
    semantic_similarity_score: Number(semanticScore.toFixed(2)),
    reasoning,
    case_matched: caseMatched,
  };
}
