import { z } from 'zod';

// ==========================================
// 1. ENUMS & CONSTANTS
// ==========================================
export enum Role {
  TRAVELER = 'TRAVELER',
  PROVIDER = 'PROVIDER',
  ADMIN = 'ADMIN',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum Category {
  FOOD = 'FOOD',
  CULTURE = 'CULTURE',
  ADVENTURE = 'ADVENTURE',
  HIDDEN_GEMS = 'HIDDEN_GEMS',
  NIGHTLIFE = 'NIGHTLIFE',
  EVENTS = 'EVENTS',
  WORKSHOPS = 'WORKSHOPS',
  SHOPPING = 'SHOPPING',
}

export enum EventType {
  VIEW = 'VIEW',
  SAVE = 'SAVE',
  CLICK = 'CLICK',
  COMPLETE = 'COMPLETE',
}

export enum BudgetBand {
  BUDGET = 'BUDGET',       // ₹ (0 - 500)
  MODERATE = 'MODERATE',   // ₹₹ (500 - 1500)
  PREMIUM = 'PREMIUM',     // ₹₹₹ (1500 - 4000)
  LUXURY = 'LUXURY',       // ₹₹₹₹ (4000+)
}

// ==========================================
// 2. AUTH & USER SCHEMAS / DTOS
// ==========================================
export const RegisterTravelerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2),
  homeCity: z.string().optional(),
  interests: z.array(z.nativeEnum(Category)).default([]),
  budgetBand: z.nativeEnum(BudgetBand).default(BudgetBand.MODERATE),
  travelStyle: z.string().optional(),
});

export type RegisterTravelerDto = z.infer<typeof RegisterTravelerSchema>;

export const UpdateTravelerProfileSchema = z.object({
  name: z.string().min(2).optional(),
  homeCity: z.string().optional(),
  interests: z.array(z.nativeEnum(Category)).optional(),
  budgetBand: z.nativeEnum(BudgetBand).optional(),
  travelStyle: z.string().optional(),
});

export type UpdateTravelerProfileDto = z.infer<typeof UpdateTravelerProfileSchema>;

export const UpdateProviderProfileSchema = z.object({
  name: z.string().min(2).optional(),
  businessName: z.string().min(2).optional(),
  businessType: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export type UpdateProviderProfileDto = z.infer<typeof UpdateProviderProfileSchema>;

export const RegisterProviderSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2),
  businessName: z.string().min(2),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Valid phone number with country code is required'),
  businessType: z.string().min(2),
  city: z.string().min(2),
});

export type RegisterProviderDto = z.infer<typeof RegisterProviderSchema>;

export const RegisterUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional().default('Traveler'),
  role: z.enum([Role.TRAVELER, Role.PROVIDER]).default(Role.TRAVELER),
  // Optional profile fields
  homeCity: z.string().optional(),
  businessName: z.string().optional(),
  businessType: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export type RegisterUserDto = z.infer<typeof RegisterUserSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  role: z.enum([Role.TRAVELER, Role.PROVIDER]).optional(),
  mfaCode: z.string().length(6).optional(),
});

export type LoginDto = z.infer<typeof LoginSchema>;

export const MfaVerifySchema = z.object({
  mfaCode: z.string().length(6),
});

export type MfaVerifyDto = z.infer<typeof MfaVerifySchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenDto = z.infer<typeof RefreshTokenSchema>;

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: Role;
    name: string;
    mfaEnabled: boolean;
    verificationStatus?: VerificationStatus;
  };
}

// ==========================================
// 3. KYC SCHEMAS / DTOS
// ==========================================
export const RequestKycUploadUrlSchema = z.object({
  documentType: z.enum(['BUSINESS_REGISTRATION', 'GOVERNMENT_ID', 'GST_CERTIFICATE']),
  fileName: z.string().min(1),
  mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
});

export type RequestKycUploadUrlDto = z.infer<typeof RequestKycUploadUrlSchema>;

export const SubmitKycVerificationSchema = z.object({
  documentType: z.enum(['BUSINESS_REGISTRATION', 'GOVERNMENT_ID', 'GST_CERTIFICATE']),
  documentStorageKey: z.string().min(5),
  notes: z.string().max(500).optional(),
});

export type SubmitKycVerificationDto = z.infer<typeof SubmitKycVerificationSchema>;

// ==========================================
// 4. EXPERIENCE SCHEMAS & DTOS
// ==========================================
export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export type GeoLocation = z.infer<typeof GeoLocationSchema>;

export const AvailabilityRuleSchema = z.object({
  daysOfWeek: z.array(z.number().int().min(0).max(6)), // 0 = Sunday, 6 = Saturday
  openTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Format HH:MM'),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):?([0-5]\d)$/, 'Format HH:MM'),
  slotDurationMinutes: z.number().int().positive().default(60),
  maxCapacityPerSlot: z.number().int().positive().default(10),
});

export type AvailabilityRule = z.infer<typeof AvailabilityRuleSchema>;

export const CreateExperienceSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(20).max(4000),
  category: z.nativeEnum(Category),
  location: GeoLocationSchema,
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().default('India'),
  priceMin: z.number().nonnegative(),
  priceMax: z.number().nonnegative(),
  currency: z.string().default('INR'),
  budgetBand: z.nativeEnum(BudgetBand),
  accessibilityTags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string().url()).min(1),
  availabilityRules: z.array(AvailabilityRuleSchema).min(1),
  durationMinutes: z.number().int().positive().default(120),
});

export type CreateExperienceDto = z.infer<typeof CreateExperienceSchema>;

export const UpdateExperienceSchema = CreateExperienceSchema.partial();
export type UpdateExperienceDto = z.infer<typeof UpdateExperienceSchema>;

export const SearchExperiencesQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(100).default(25),
  city: z.string().optional(),
  category: z.nativeEnum(Category).optional(),
  budgetBand: z.nativeEnum(BudgetBand).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(20), // strict pagination cap
});

export type SearchExperiencesQueryDto = z.infer<typeof SearchExperiencesQuerySchema>;

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// 5. RECOMMENDATION & AI CONTRACTS
// ==========================================
export const RecommendationRequestSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().positive().max(100).default(20),
  categories: z.array(z.nativeEnum(Category)).optional(),
  budgetBand: z.nativeEnum(BudgetBand).optional(),
  groupSize: z.number().int().positive().default(1),
  timeOfDay: z.enum(['MORNING', 'AFTERNOON', 'EVENING', 'NIGHT']).optional(),
  userIntent: z.string().max(200).optional(), // e.g. "authentic street food with friends"
  limit: z.number().int().positive().max(20).default(10),
});

export type RecommendationRequestDto = z.infer<typeof RecommendationRequestSchema>;

export interface CandidateScoreBreakdown {
  locationMatch: number;          // 0.0 - 1.0
  intentMatch: number;            // 0.0 - 1.0
  budgetFit: number;              // 0.0 - 1.0
  timeAvailability: number;       // 0.0 - 1.0
  ratingScore: number;            // 0.0 - 1.0
  authenticityScore: number;      // 0.0 - 1.0
  distancePenalty: number;        // 0.0 - 1.0
  finalScore: number;             // 0.0 - 1.0
  // Session-aware factors (only present in session-mode recommendations)
  routeContinuityScore?: number;  // 0.0 - 1.0
  diversityScore?: number;        // 0.0 - 1.0
  rejectionPenalty?: number;      // 0.0 - 1.0
}

export interface RecommendationCandidateDto {
  id: string;
  title: string;
  category: Category;
  city: string;
  distanceKm: number;
  priceMin: number;
  priceMax: number;
  budgetBand: BudgetBand;
  ratingAverage: number;
  reviewCount: number;
  authenticityRating: number;
  accessibilityTags: string[];
  mediaUrls: string[];
  scoreBreakdown: CandidateScoreBreakdown;
  aiExplanation?: string;
}

export interface RecommendationResponseDto {
  requestId: string;
  recommendations: RecommendationCandidateDto[];
  locationContextHash: string; // anonymized coarse location hash, never raw coordinates
  generatedAt: string;
}

// AI Reasoning Output Contract
export interface AiExplanationResult {
  experienceId: string;
  whyThis: string;
  highlightHook: string;
}

export interface AiReasoningPayload {
  userIntent?: string;
  groupSize: number;
  budgetBand?: BudgetBand;
  candidates: Array<{
    id: string;
    title: string;
    category: Category;
    city: string;
    distanceKm: number;
    priceMin: number;
    priceMax: number;
    ratingAverage: number;
    authenticityRating: number;
    accessibilityTags: string[];
  }>;
}

// ==========================================
// 6. REVIEWS & INTERACTIONS SCHEMAS
// ==========================================
export const LogInteractionSchema = z.object({
  experienceId: z.string().uuid(),
  eventType: z.nativeEnum(EventType),
  metadata: z.record(z.unknown()).optional(),
});

export type LogInteractionDto = z.infer<typeof LogInteractionSchema>;

export const CreateReviewSchema = z.object({
  experienceId: z.string().uuid(),
  ratingOverall: z.number().int().min(1).max(5),
  ratingAuthenticity: z.number().int().min(1).max(5),
  ratingValue: z.number().int().min(1).max(5),
  ratingExperience: z.number().int().min(1).max(5),
  ratingAccessibility: z.number().int().min(1).max(5),
  text: z.string().min(10).max(2000),
});

export type CreateReviewDto = z.infer<typeof CreateReviewSchema>;

// ==========================================
// 7. TRIP SESSION — ENUMS, DTOs, CONTRACTS
// ==========================================

export enum TripSessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  ABANDONED = 'ABANDONED',
}

export enum WeatherTag {
  INDOOR = 'INDOOR',
  OUTDOOR = 'OUTDOOR',
  WEATHER_DEPENDENT = 'WEATHER_DEPENDENT',
}

export const CreateTripSessionSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  totalBudget: z.number().positive(),
  totalTimeMinutes: z.number().int().positive().max(1440), // max 24h
  groupSize: z.number().int().positive().default(1),
  interests: z.array(z.nativeEnum(Category)).min(1),
  accessibilityRequirements: z.array(z.string()).default([]),
});
export type CreateTripSessionDto = z.infer<typeof CreateTripSessionSchema>;

export const AddSelectionSchema = z.object({
  experienceId: z.string().uuid(),
  experienceCost: z.number().nonnegative(), // actual cost charged for this stop
  durationMinutes: z.number().int().positive(),
  nextLatitude: z.number().min(-90).max(90),   // location of the selected experience
  nextLongitude: z.number().min(-180).max(180),
});
export type AddSelectionDto = z.infer<typeof AddSelectionSchema>;

export const RejectCandidateSchema = z.object({
  experienceId: z.string().uuid(),
  category: z.nativeEnum(Category),
});
export type RejectCandidateDto = z.infer<typeof RejectCandidateSchema>;

export const RemoveStopSchema = z.object({
  experienceId: z.string().uuid(),
});
export type RemoveStopDto = z.infer<typeof RemoveStopSchema>;

// ==========================================
// 8. SCORING ENGINE — SESSION CONTEXT
// ==========================================

/**
 * Optional context passed to calculateScore() for session-aware scoring.
 * When undefined, all session factors contribute 0.0 and the existing
 * single-shot scoring path is provably unaffected.
 */
export interface SessionScoringContext {
  currentLocationLat: number;
  currentLocationLng: number;
  previousLocationLat?: number; // second-to-last stop, used for bearing consistency
  previousLocationLng?: number;
  selectedCategories: Category[];
  rejectedCategories: Category[];
  rejectedExperienceIds: string[];
}

// ==========================================
// 9. AI SESSION RESPONSE SHAPES
// ==========================================

/**
 * Per-step explanation for a session recommendation (replaces AiExplanationResult in session flow).
 * Distinct, schema-validated shape — not a freeform chat response.
 */
export interface AiItineraryStepResult {
  experienceId: string;
  stepExplanation: string; // "Why this fits your itinerary now, given your path so far"
  highlightHook: string;   // 2–3 word hook
}

/**
 * Wrap-up prompt shown when a stop condition is near but not yet hit.
 * Generated by AI Reasoning Service when backend sets wrapUpFlag=true.
 * The LLM phrases it; the backend decides when to trigger it.
 */
export interface AiWrapUpPrompt {
  message: string;
  triggerReason: 'LOW_TIME' | 'LOW_BUDGET' | 'NO_CANDIDATES';
}

/**
 * Weather-adapt message shown when adverse weather is detected.
 */
export interface AiWeatherAdaptPrompt {
  message: string;
  affectedCandidateIds: string[]; // IDs that were deprioritised due to weather
}

// ==========================================
// 10. STOP CONDITION RESULT
// ==========================================

/**
 * Result of evaluateStopConditions() — a pure function in trip-session.utils.ts.
 * The backend calls this; the AI Reasoning Service only phrases the message,
 * never decides whether to stop.
 */
export interface StopConditionResult {
  shouldStop: boolean;
  reason?: 'USER_DONE' | 'TIME_EXHAUSTED' | 'BUDGET_EXHAUSTED' | 'NO_CANDIDATES';
  /** True when time/budget is low but not yet zero — triggers AiWrapUpPrompt */
  isNearlyExhausted: boolean;
  wrapUpFlag: boolean;
  wrapUpTriggerReason?: 'LOW_TIME' | 'LOW_BUDGET' | 'NO_CANDIDATES';
}

// ==========================================
// 11. SESSION-AWARE AI PAYLOAD (extends AiReasoningPayload)
// ==========================================
export interface SessionAiReasoningPayload extends AiReasoningPayload {
  sessionContext?: {
    remainingTimeMinutes: number;
    remainingBudget: number;
    stopConditionNear: boolean; // wrapUpFlag from StopConditionResult
    weatherAdverse: boolean;
    selectedCount: number;
    lastStopTitle?: string;
  };
}

// ==========================================
// 12. PROVIDER LISTING — DRAFT & PUBLISH
// ==========================================

/**
 * Draft payload for match-preview endpoint.
 * All fields optional — host may call this at any step of the form.
 * Zero traveler PII; operates purely on listing data.
 */
export const MatchPreviewRequestSchema = z.object({
  /** Not yet-persisted draft — provide these from form state */
  category: z.nativeEnum(Category).optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  budgetBand: z.nativeEnum(BudgetBand).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  accessibilityTags: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
  description: z.string().optional(),
  availabilityRules: z
    .array(
      z.object({
        daysOfWeek: z.array(z.number()),
        openTime: z.string(),
        closeTime: z.string(),
      }),
    )
    .default([]),
  durationMinutes: z.number().int().positive().optional(),
});

export type MatchPreviewRequestDto = z.infer<typeof MatchPreviewRequestSchema>;

/** A single dimension contribution shown to the host */
export interface MatchPreviewDimension {
  key: string;        // e.g. "budgetFit"
  label: string;      // e.g. "Budget fit"
  score: number;      // 0.0 – 1.0
  weight: number;     // w_i from recommendation.config.ts
  contribution: number; // score * weight, rounded
  tip?: string;       // optional short improvement hint
}

export interface MatchPreviewResponseDto {
  /** Human-readable templated summary (no LLM) */
  segmentSummary: string;
  /** Ordered dimension breakdown — same dimensions as scoring engine */
  dimensions: MatchPreviewDimension[];
  /** Estimated composite score if listed now (0–1) */
  estimatedScore: number;
  /** Nudges derived from the same listing data */
  nudges: NudgeItem[];
  /** True when minimum publish requirements are met */
  publishEligible: boolean;
}

// ==========================================
// 13. LISTING NUDGES
// ==========================================

export type NudgeImpact = 'HIGH' | 'MEDIUM';

export interface NudgeItem {
  /** Scoring dimension this nudge relates to */
  dimension: string;
  message: string;
  impact: NudgeImpact;
}
