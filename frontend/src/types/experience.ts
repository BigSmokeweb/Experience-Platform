// Shared ExperienceData interface for frontend components
export interface ExperienceData {
  id: string;
  title: string;
  name?: string;
  category: string;
  categoryLabel?: string;
  city: string;
  area: string;
  priceMin?: number;
  priceMax?: number;
  durationMinutes?: number;
  ratingAverage?: number;
  authenticityRating?: number;
  authenticityScore?: number;
  candidateLat: number;
  candidateLng: number;
  mediaUrls: string[];
  images?: string[];
  description?: string;
  bestTime?: string;
  bestFor?: string | string[];
  vibe?: string;
  tags?: string[];
  humanTip?: string;
  operatingHours?: string;
  closedDays?: string;
  bookingType?: string;
  mustTry?: string;
  accessibilityNotes?: string;
  reviewCount?: number;
  provider?: {
    businessName?: string;
    verificationStatus?: string;
  };
  'cover row'?: string;
  cover?: string;
  [key: string]: any;
}
