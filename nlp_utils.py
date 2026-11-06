import re
import math
from typing import List, Dict, Tuple, Optional, Any

# Category keywords lexicon for lightweight classification
CATEGORY_LEXICON = {
    'Roads & Potholes': {
        'primary': ['pothole', 'crater', 'asphalt', 'road broken', 'tar', 'sinkhole', 'pavement broken', 'uneven road', 'manhole cover missing'],
        'secondary': ['road', 'street', 'footpath', 'sidewalk', 'curb', 'divider broken', 'driveway', 'trench']
    },
    'Sanitation & Waste': {
        'primary': ['garbage', 'trash', 'waste dump', 'overflowing bin', 'debris', 'dead animal', 'stench', 'smell', 'littering'],
        'secondary': ['dump', 'plastic waste', 'compost', 'rubbish', 'sweeper', 'dustbin', 'filth']
    },
    'Streetlighting & Electrical': {
        'primary': ['streetlight', 'lamp post', 'dark street', 'pole broken', 'exposed wire', 'hanging wire', 'sparking transformer', 'blackout'],
        'secondary': ['light', 'bulb', 'electric', 'cable', 'transformer', 'illumination', 'power cut']
    },
    'Water Supply & Drainage': {
        'primary': ['water leak', 'pipe burst', 'drainage overflow', 'sewage leak', 'clogged drain', 'open gutter', 'manhole overflowing', 'contaminated water'],
        'secondary': ['water', 'drain', 'gutter', 'flooding', 'stagnant water', 'pipeline', 'sewer', 'tap leaking']
    },
    'Parks & Public Amenities': {
        'primary': ['park', 'playground', 'broken swing', 'bench broken', 'overgrown grass', 'fallen branch', 'tree collapsed', 'public toilet'],
        'secondary': ['garden', 'fountain', 'public gym', 'fence broken', 'walkway', 'recreation']
    },
    'Traffic & Signage': {
        'primary': ['traffic light', 'stop sign broken', 'traffic signal', 'zebra crossing faded', 'speed breaker unpainted', 'blind spot mirror', 'one way sign'],
        'secondary': ['traffic', 'signal', 'signboard', 'speed bump', 'bollard', 'pedestrian crossing', 'sign']
    }
}

CRITICAL_TERMS = [
    'burst', 'sparking', 'electric shock', 'exposed wire', 'sinkhole', 'deep crater',
    'sewage into drinking water', 'open manhole', 'hazard', 'life threatening', 'school entrance flooded',
    'collapsed tree on powerline', 'ambulance blocked', 'immediate danger'
]

HIGH_TERMS = [
    'completely dark', 'large pothole', 'flooded road', 'broken signal', 'overflowing sewage',
    'blocked main road', 'fallen pole', 'major leak', 'heavy traffic jam', 'elderly injured'
]

LOW_TERMS = [
    'faded paint', 'small litter', 'minor squeak', 'aesthetic', 'trim bushes', 'clean board'
]

def tokenize(text: str) -> List[str]:
    """Tokenize and normalize text into clean words."""
    cleaned = re.sub(r'[^\w\s]', ' ', text.lower())
    return [w for w in cleaned.split() if len(w) > 2]

def classify_text(title: str, description: str) -> Dict[str, Any]:
    """Lightweight rule-based categorization and priority scoring."""
    combined = f"{title} {description}".lower()
    
    scores = {}
    matched_terms = {}
    for cat, lex in CATEGORY_LEXICON.items():
        score = 0.0
        matches = []
        for term in lex['primary']:
            if term in combined:
                score += 3.0
                matches.append(term)
        for term in lex['secondary']:
            if term in combined:
                score += 1.5
                matches.append(term)
        scores[cat] = score
        matched_terms[cat] = matches

    best_cat = 'Other'
    best_score = 0.0
    for cat, score in scores.items():
        if score > best_score:
            best_score = score
            best_cat = cat

    confidence = min(0.95, max(0.40, best_score / 6.0))

    priority = 'Medium'
    if any(term in combined for term in CRITICAL_TERMS):
        priority = 'Critical'
    elif any(term in combined for term in HIGH_TERMS):
        priority = 'High'
    elif any(term in combined for term in LOW_TERMS):
        priority = 'Low'
    elif best_cat in ['Streetlighting & Electrical', 'Water Supply & Drainage']:
        priority = 'High'

    return {
        'recommended_category': best_cat,
        'recommended_priority': priority,
        'confidence': round(confidence, 2),
        'matched_keywords': list(set(matched_terms.get(best_cat, [])))
    }

def calculate_haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def calculate_jaccard(tokens1: List[str], tokens2: List[str]) -> float:
    """Jaccard similarity coefficient."""
    s1, s2 = set(tokens1), set(tokens2)
    if not s1 or not s2:
        return 0.0
    intersection = len(s1.intersection(s2))
    union = len(s1.union(s2))
    return intersection / union if union > 0 else 0.0

def calculate_cosine(text1: str, text2: str) -> float:
    """Cosine similarity over term frequency representation."""
    tokens1 = tokenize(text1)
    tokens2 = tokenize(text2)
    
    freq1: Dict[str, int] = {}
    freq2: Dict[str, int] = {}
    vocab = set()
    
    for t in tokens1:
        freq1[t] = freq1.get(t, 0) + 1
        vocab.add(t)
    for t in tokens2:
        freq2[t] = freq2.get(t, 0) + 1
        vocab.add(t)
        
    dot_product = sum(freq1.get(w, 0) * freq2.get(w, 0) for w in vocab)
    norm1 = math.sqrt(sum(v * v for v in freq1.values()))
    norm2 = math.sqrt(sum(v * v for v in freq2.values()))
    
    if norm1 == 0.0 or norm2 == 0.0:
        return 0.0
    return dot_product / (norm1 * norm2)

def detect_duplicate(
    new_title: str,
    new_description: str,
    new_lat: Optional[float],
    new_lon: Optional[float],
    category: str,
    existing_reports: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Detect potential duplicates using text similarity and geo-proximity.
    Flags report for review; does NOT automatically delete.
    """
    combined_new = f"{new_title} {new_description}"
    tokens_new = tokenize(combined_new)
    
    best_match = None
    highest_score = 0.0
    reason_parts = []

    for existing in existing_reports:
        if existing.get('status') == 'REJECTED_DUPLICATE':
            continue

        combined_existing = f"{existing.get('title', '')} {existing.get('description', '')}"
        tokens_existing = tokenize(combined_existing)

        # Text similarity
        jaccard = calculate_jaccard(tokens_new, tokens_existing)
        cosine = calculate_cosine(combined_new, combined_existing)
        text_sim = (jaccard * 0.4) + (cosine * 0.6)

        category_match = existing.get('category') == category

        # Geographic proximity
        proximity_boost = 0.0
        distance = None
        if new_lat is not None and new_lon is not None:
            ex_lat = existing.get('latitude')
            ex_lon = existing.get('longitude')
            if ex_lat is not None and ex_lon is not None:
                distance = calculate_haversine_meters(new_lat, new_lon, ex_lat, ex_lon)
                if distance <= 50:
                    proximity_boost = 0.35
                elif distance <= 150:
                    proximity_boost = 0.25
                elif distance <= 350:
                    proximity_boost = 0.15

        total_score = (text_sim * 0.65) + (0.10 if category_match else 0.0) + proximity_boost
        
        # Boost exact title match
        if new_title.strip().lower() == str(existing.get('title', '')).strip().lower():
            total_score = max(total_score, 0.85)

        if total_score > highest_score:
            highest_score = total_score
            best_match = existing
            reasons = []
            if text_sim > 0.4:
                reasons.append(f"{int(text_sim * 100)}% text similarity")
            if category_match:
                reasons.append(f"matching category '{category}'")
            if distance is not None and distance <= 350:
                reasons.append(f"within {int(distance)}m radius")
            reason_parts = reasons

    is_duplicate = highest_score >= 0.48 and best_match is not None

    return {
        'is_potential_duplicate': is_duplicate,
        'matched_report': best_match if is_duplicate else None,
        'confidence': round(highest_score, 2),
        'reason': ", ".join(reason_parts) if reason_parts else 'Significant contextual overlap'
    }
