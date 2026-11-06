import { IssueCategory, PriorityLevel, CivicReport, DuplicateCheckResult } from '../types';

// Lexicon for lightweight categorization
const CATEGORY_KEYWORDS: Record<IssueCategory, { terms: string[]; weight: number }[]> = {
  'Roads & Potholes': [
    { terms: ['pothole', 'crater', 'asphalt', 'road broken', 'tar', 'sinkhole', 'pavement broken', 'uneven road', 'manhole cover missing'], weight: 3 },
    { terms: ['road', 'street', 'footpath', 'sidewalk', 'curb', 'divider broken', 'driveway', 'trench'], weight: 1.5 },
  ],
  'Sanitation & Waste': [
    { terms: ['garbage', 'trash', 'waste dump', 'overflowing bin', 'debris', 'dead animal', 'stench', 'smell', 'littering'], weight: 3 },
    { terms: ['dump', 'plastic waste', 'compost', 'rubbish', 'sweeper', 'dustbin', 'filth'], weight: 1.5 },
  ],
  'Streetlighting & Electrical': [
    { terms: ['streetlight', 'lamp post', 'dark street', 'pole broken', 'exposed wire', 'hanging wire', 'sparking transformer', 'blackout'], weight: 3 },
    { terms: ['light', 'bulb', 'electric', 'cable', 'transformer', 'illumination', 'power cut'], weight: 1.5 },
  ],
  'Water Supply & Drainage': [
    { terms: ['water leak', 'pipe burst', 'drainage overflow', 'sewage leak', 'clogged drain', 'open gutter', 'manhole overflowing', 'contaminated water'], weight: 3 },
    { terms: ['water', 'drain', 'gutter', 'flooding', 'stagnant water', 'pipeline', 'sewer', 'tap leaking'], weight: 1.5 },
  ],
  'Parks & Public Amenities': [
    { terms: ['park', 'playground', 'broken swing', 'bench broken', 'overgrown grass', 'fallen branch', 'tree collapsed', 'public toilet'], weight: 3 },
    { terms: ['garden', 'fountain', 'public gym', 'fence broken', 'walkway', 'recreation'], weight: 1.5 },
  ],
  'Traffic & Signage': [
    { terms: ['traffic light', 'stop sign broken', 'traffic signal', 'zebra crossing faded', 'speed breaker unpainted', 'blind spot mirror', 'one way sign'], weight: 3 },
    { terms: ['traffic', 'signal', 'signboard', 'speed bump', 'bollard', 'pedestrian crossing', 'sign'], weight: 1.5 },
  ],
  'Other': [
    { terms: ['stray dogs', 'encroachment', 'illegal hoarding', 'noise pollution', 'nuisance'], weight: 1 },
  ],
};

const CRITICAL_KEYWORDS = [
  'burst', 'sparking', 'electric shock', 'exposed wire', 'sinkhole', 'deep crater',
  'sewage into drinking water', 'open manhole', 'hazard', 'life threatening', 'school entrance flooded',
  'collapsed tree on powerline', 'ambulance blocked', 'immediate danger'
];

const HIGH_KEYWORDS = [
  'completely dark', 'large pothole', 'flooded road', 'broken signal', 'overflowing sewage',
  'blocked main road', 'fallen pole', 'major leak', 'heavy traffic jam', 'elderly injured'
];

const LOW_KEYWORDS = [
  'faded paint', 'small litter', 'minor squeak', 'aesthetic', 'trim bushes', 'clean board'
];

// Tokenizer & normalizer
export function tokenizeText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

// Categorization logic
export function classifyReport(title: string, description: string): {
  recommendedCategory: IssueCategory;
  recommendedPriority: PriorityLevel;
  confidence: number;
  matchedKeywords: string[];
} {
  const combined = `${title} ${description}`.toLowerCase();
  const scores: Record<IssueCategory, { score: number; matches: string[] }> = {
    'Roads & Potholes': { score: 0, matches: [] },
    'Sanitation & Waste': { score: 0, matches: [] },
    'Streetlighting & Electrical': { score: 0, matches: [] },
    'Water Supply & Drainage': { score: 0, matches: [] },
    'Parks & Public Amenities': { score: 0, matches: [] },
    'Traffic & Signage': { score: 0, matches: [] },
    'Other': { score: 0.1, matches: [] },
  };

  for (const [category, groups] of Object.entries(CATEGORY_KEYWORDS) as [IssueCategory, { terms: string[]; weight: number }[]][]) {
    for (const group of groups) {
      for (const term of group.terms) {
        if (combined.includes(term)) {
          scores[category].score += group.weight;
          scores[category].matches.push(term);
        }
      }
    }
  }

  // Determine highest scoring category
  let topCategory: IssueCategory = 'Other';
  let highestScore = 0;
  let topMatches: string[] = [];

  for (const [cat, data] of Object.entries(scores) as [IssueCategory, { score: number; matches: string[] }][]) {
    if (data.score > highestScore) {
      highestScore = data.score;
      topCategory = cat;
      topMatches = data.matches;
    }
  }

  const confidence = Math.min(0.95, Math.max(0.4, highestScore / 6));

  // Determine priority
  let priority: PriorityLevel = 'Medium';
  if (CRITICAL_KEYWORDS.some(kw => combined.includes(kw))) {
    priority = 'Critical';
  } else if (HIGH_KEYWORDS.some(kw => combined.includes(kw))) {
    priority = 'High';
  } else if (LOW_KEYWORDS.some(kw => combined.includes(kw))) {
    priority = 'Low';
  } else if (topCategory === 'Streetlighting & Electrical' || topCategory === 'Water Supply & Drainage') {
    priority = 'High'; // Electrical & water leaks default higher priority for safety
  }

  return {
    recommendedCategory: topCategory,
    recommendedPriority: priority,
    confidence,
    matchedKeywords: Array.from(new Set(topMatches)),
  };
}

// Distance calculation between coordinates (Haversine formula in meters)
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Jaccard similarity between two token sets
export function calculateJaccardSimilarity(tokensA: string[], tokensB: string[]): number {
  const setA = new Set(tokensA);
  const setB = new Set(tokensB);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersectionCount = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersectionCount++;
    }
  }

  const unionCount = setA.size + setB.size - intersectionCount;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

// Cosine similarity over term frequency
export function calculateCosineSimilarity(textA: string, textB: string): number {
  const tokensA = tokenizeText(textA);
  const tokensB = tokenizeText(textB);

  const freqA: Record<string, number> = {};
  const freqB: Record<string, number> = {};
  const vocabulary = new Set<string>();

  for (const t of tokensA) {
    freqA[t] = (freqA[t] || 0) + 1;
    vocabulary.add(t);
  }
  for (const t of tokensB) {
    freqB[t] = (freqB[t] || 0) + 1;
    vocabulary.add(t);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const word of vocabulary) {
    const vA = freqA[word] || 0;
    const vB = freqB[word] || 0;
    dotProduct += vA * vB;
    normA += vA * vA;
    normB += vB * vB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Duplicate Detection Engine
export function checkForDuplicateReport(
  newTitle: string,
  newDescription: string,
  newLat: number | null,
  newLon: number | null,
  category: IssueCategory,
  existingReports: CivicReport[]
): DuplicateCheckResult {
  const combinedNew = `${newTitle} ${newDescription}`;
  const newTokens = tokenizeText(combinedNew);

  let bestMatch: CivicReport | null = null;
  let highestScore = 0;
  let matchReason = '';

  for (const existing of existingReports) {
    // Only check active or recently submitted reports (skip rejected duplicates)
    if (existing.status === 'REJECTED_DUPLICATE') continue;

    const combinedExisting = `${existing.title} ${existing.description}`;
    const existingTokens = tokenizeText(combinedExisting);

    // 1. Text Similarity Score (weighted blend of Jaccard and Cosine)
    const jaccard = calculateJaccardSimilarity(newTokens, existingTokens);
    const cosine = calculateCosineSimilarity(combinedNew, combinedExisting);
    const textSim = jaccard * 0.4 + cosine * 0.6;

    // 2. Category Match
    const categoryMatch = existing.category === category;

    // 3. Proximity Check
    let proximityBoost = 0;
    let distanceMeters: number | null = null;

    if (newLat !== null && newLon !== null && existing.latitude !== null && existing.longitude !== null) {
      distanceMeters = calculateDistanceMeters(newLat, newLon, existing.latitude, existing.longitude);
      if (distanceMeters <= 50) {
        proximityBoost = 0.35; // within 50 meters
      } else if (distanceMeters <= 150) {
        proximityBoost = 0.25; // within 150 meters
      } else if (distanceMeters <= 350) {
        proximityBoost = 0.15; // within 350 meters
      }
    }

    // Total composite duplicate score (0.0 to 1.0)
    let totalScore = textSim * 0.65;
    if (categoryMatch) totalScore += 0.1;
    totalScore += proximityBoost;

    // Direct title phrase overlap boost
    if (newTitle.trim().toLowerCase() === existing.title.trim().toLowerCase()) {
      totalScore = Math.max(totalScore, 0.85);
    }

    if (totalScore > highestScore) {
      highestScore = totalScore;
      bestMatch = existing;
      
      const reasons: string[] = [];
      if (textSim > 0.4) reasons.push(`${Math.round(textSim * 100)}% text semantic similarity`);
      if (categoryMatch) reasons.push(`matching '${category}' category`);
      if (distanceMeters !== null && distanceMeters <= 350) {
        reasons.push(`located only ${Math.round(distanceMeters)}m away`);
      }
      matchReason = reasons.join(', ') || 'High contextual overlap';
    }
  }

  // Threshold for flagging duplicate: 0.48
  const isDuplicate = highestScore >= 0.48 && bestMatch !== null;

  return {
    is_potential_duplicate: isDuplicate,
    matched_report: isDuplicate ? bestMatch : null,
    confidence: Number(highestScore.toFixed(2)),
    reason: matchReason,
  };
}
