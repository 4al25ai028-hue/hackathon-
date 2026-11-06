import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  Sparkles, 
  AlertCircle, 
  Shield, 
  Check, 
  ChevronRight,
  Info,
  Loader2,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';
import { IssueCategory, PriorityLevel, DuplicateCheckResult, CivicReport } from '../types';
import { classifyReport } from '../services/classifier';
import { MapView } from './MapView';

interface SubmitReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newReport: CivicReport) => void;
  existingReports: CivicReport[];
}

const CATEGORIES: IssueCategory[] = [
  'Roads & Potholes',
  'Sanitation & Waste',
  'Streetlighting & Electrical',
  'Water Supply & Drainage',
  'Parks & Public Amenities',
  'Traffic & Signage',
  'Other',
];

const WARDS = [
  'Ward 12 (Central)',
  'Ward 7 (West)',
  'Ward 5 (North)',
  'Ward 9 (South)',
  'Ward 3 (East)',
  'General Municipal Area',
];

export const SubmitReportModal: React.FC<SubmitReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  existingReports,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<IssueCategory>('Roads & Potholes');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');
  const [address, setAddress] = useState('');
  const [ward, setWard] = useState(WARDS[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [submitterContact, setSubmitterContact] = useState('');
  
  // Location coordinates
  const [latitude, setLatitude] = useState<number | null>(12.9716);
  const [longitude, setLongitude] = useState<number | null>(77.6412);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // Real-time AI classification recommendation
  const [aiSuggestion, setAiSuggestion] = useState<{
    recommendedCategory: IssueCategory;
    recommendedPriority: PriorityLevel;
    confidence: number;
    matchedKeywords: string[];
  } | null>(null);

  // Real-time duplicate check result
  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Trigger classification and duplicate check debounce
  useEffect(() => {
    if (!title && !description) {
      setAiSuggestion(null);
      setDuplicateCheck(null);
      return;
    }

    const timer = setTimeout(async () => {
      // 1. Local NLP classification
      const result = classifyReport(title, description);
      setAiSuggestion(result);
      if (result.matchedKeywords.length > 0) {
        setCategory(result.recommendedCategory);
        setPriority(result.recommendedPriority);
      }

      // 2. Duplicate detection API
      if (title.length >= 5) {
        setIsCheckingDuplicate(true);
        try {
          const res = await fetch('/api/reports/check-duplicate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title,
              description,
              latitude,
              longitude,
              category,
            }),
          });
          const data = await res.json();
          setDuplicateCheck(data);
        } catch {
          // ignore background check failure
        } finally {
          setIsCheckingDuplicate(false);
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [title, description, latitude, longitude, category]);

  if (!isOpen) return null;

  const handleUsePresetPhoto = (sampleUrl: string) => {
    setImageUrl(sampleUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please provide both an issue title and a detailed description.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          category,
          priority,
          address: address.trim() || 'Central Municipal Ward',
          latitude,
          longitude,
          ward,
          image_url: imageUrl,
          is_anonymous: isAnonymous,
          submitter_name: submitterName,
          submitter_contact: submitterContact,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to submit report');
      }

      onSuccess(data.report);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div>
            <h2 className="text-base font-bold text-slate-900">Report a Civic Problem</h2>
            <p className="text-xs text-slate-500">
              Submit local infrastructure or public issues directly to municipal departments
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto text-xs">
          
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Issue Title */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Issue Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Deep crater pothole opposite St. Mark School"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Detailed Problem Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what is broken, approximate dimensions, road hazard level, or risk to pedestrians..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-xs"
            />
          </div>

          {/* AI / NLP Classification Recommendation Banner */}
          {aiSuggestion && aiSuggestion.matchedKeywords.length > 0 && (
            <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-lg flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-medium text-emerald-900">
                  <span>Auto-Categorised as: <strong>{aiSuggestion.recommendedCategory}</strong></span>
                  <span className="text-emerald-600 text-[11px]">({Math.round(aiSuggestion.confidence * 100)}% match)</span>
                </div>
                <div className="text-[11px] text-emerald-700">
                  Key signals detected: {aiSuggestion.matchedKeywords.join(', ')} · Recommended Priority: {aiSuggestion.recommendedPriority}
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Detection Alert Banner (PS-14 Strict Compliance) */}
          {duplicateCheck && duplicateCheck.is_potential_duplicate && duplicateCheck.matched_report && (
            <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  Potential Duplicate Issue Detected
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded">
                  {Math.round(duplicateCheck.confidence * 100)}% Match
                </span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                A very similar issue was already submitted nearby:
                <strong className="block text-slate-900 font-semibold mt-0.5">
                  "{duplicateCheck.matched_report.title}" ({duplicateCheck.matched_report.id})
                </strong>
                <span className="text-amber-700 italic block mt-1">
                  Reason: {duplicateCheck.reason}
                </span>
              </p>
              <div className="text-[11px] text-amber-900/90 bg-amber-100/50 p-2 rounded border border-amber-200">
                <strong>CivicConnect Policy:</strong> Submitting will not delete your report. It will be flagged for an administrator to review side-by-side and consolidate community priority.
              </div>
            </div>
          )}

          {/* Category Field */}
          <div>
            <label className="block font-semibold text-slate-800 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600/30 text-xs bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Location & Ward Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block font-semibold text-slate-800">
                Location &amp; Coordinates (Optional GPS)
              </label>
              <button
                type="button"
                onClick={() => setShowLocationPicker(!showLocationPicker)}
                className="text-emerald-700 hover:text-emerald-800 font-medium text-[11px] flex items-center gap-1"
              >
                <MapPin className="w-3.5 h-3.5" />
                {showLocationPicker ? 'Hide Map Picker' : 'Pick on Interactive Map'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street address or nearest landmark"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  {WARDS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Interactive Map Picker Container */}
            {showLocationPicker && (
              <div className="border border-slate-300 rounded-lg p-2 bg-slate-50 space-y-2">
                <div className="h-48 w-full rounded-md overflow-hidden">
                  <MapView
                    reports={existingReports}
                    selectedReport={null}
                    onSelectReport={() => {}}
                    pickLocationMode={true}
                    pickedLocation={latitude && longitude ? { lat: latitude, lon: longitude } : null}
                    onLocationPicked={(lat, lon) => {
                      setLatitude(Number(lat.toFixed(5)));
                      setLongitude(Number(lon.toFixed(5)));
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-600 px-1">
                  <span>Selected: {latitude?.toFixed(4)}, {longitude?.toFixed(4)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      // Simulating browser geo location
                      setLatitude(12.9716);
                      setLongitude(77.6412);
                      setAddress('412 5th Main Road, Ward 12');
                    }}
                    className="text-emerald-700 font-semibold hover:underline"
                  >
                    Use City Center GPS
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Photo Upload Area */}
          <div className="space-y-2">
            <label className="block font-semibold text-slate-800">
              Photographic Evidence
            </label>

            <input
              type="file"
              id="photo-upload-file-input"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {imageUrl ? (
              <div className="relative border border-slate-300 rounded-lg p-2.5 bg-slate-50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="Uploaded evidence preview"
                    className="w-14 h-14 object-cover rounded-md border border-slate-200 shrink-0"
                  />
                  <div className="truncate text-xs">
                    <span className="font-semibold text-slate-800 block truncate">Photo Attached</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Ready to submit with report</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <label
                    htmlFor="photo-upload-file-input"
                    className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-md text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
                  >
                    Change
                  </label>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="photo-upload-file-input"
                className="w-full border-2 border-dashed border-slate-300 hover:border-emerald-600 hover:bg-emerald-50/40 rounded-xl p-4 flex flex-col items-center justify-center gap-1.5 text-center cursor-pointer transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center transition-colors">
                  <Upload className="w-5 h-5 text-slate-600 group-hover:text-emerald-700" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 text-xs block group-hover:text-emerald-800">
                    Click to Upload Image
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Select photo from your camera or local gallery
                  </span>
                </div>
              </label>
            )}

            {/* Quick preset municipal sample photos */}
            <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500 overflow-x-auto pb-1">
              <span className="font-medium shrink-0">Or pick sample photo:</span>
              <button
                type="button"
                onClick={() => handleUsePresetPhoto('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 shrink-0"
              >
                Pothole
              </button>
              <button
                type="button"
                onClick={() => handleUsePresetPhoto('https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 shrink-0"
              >
                Sewage Overflow
              </button>
              <button
                type="button"
                onClick={() => handleUsePresetPhoto('https://images.unsplash.com/photo-1508873696983-2df5293cb32f?w=800&auto=format&fit=crop&q=80')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 shrink-0"
              >
                Fallen Wire
              </button>
              <button
                type="button"
                onClick={() => handleUsePresetPhoto('https://images.unsplash.com/photo-1502086223501-7ea6ecd79368?w=800&auto=format&fit=crop&q=80')}
                className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 shrink-0"
              >
                Park Damage
              </button>
            </div>

            {/* Privacy Protection Notice */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2 text-[11px] text-slate-600">
              <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Protected:</strong> All EXIF metadata, camera device serials, and GPS timestamps are sanitized automatically prior to storage.
              </span>
            </div>
          </div>

          {/* Submitter Details & Anonymity */}
          <div className="border-t border-slate-200 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800">Submitter Information</span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-slate-700 font-medium">Submit Anonymously</span>
              </label>
            </div>

            {!isAnonymous ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={submitterName}
                  onChange={(e) => setSubmitterName(e.target.value)}
                  placeholder="Your Name (e.g. Priya Sharma)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={submitterContact}
                  onChange={(e) => setSubmitterContact(e.target.value)}
                  placeholder="Phone or Email (kept confidential)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">
                Your report will be publicly listed as "Anonymous Resident" and contact info will not be retained.
              </p>
            )}
          </div>

          {/* Unverified Policy Confirmation Notice */}
          <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg text-[11px] text-blue-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span>
              <strong>Municipal Protocol:</strong> In accordance with PS-14, all submissions enter the queue as <em>Unverified</em> until triaged by the responsible civic ward officer.
            </span>
          </div>

          {/* Footer Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting to Civic Queue...</span>
                </>
              ) : (
                <>
                  <span>File Civic Report</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
