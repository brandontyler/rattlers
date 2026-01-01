/**
 * Domain models for the Christmas Lights Finder application.
 *
 * These types represent the core business entities stored in DynamoDB.
 */

/**
 * Status of a location entry.
 */
export type LocationStatus = "active" | "inactive" | "flagged";

/**
 * Type of feedback that can be submitted.
 */
export type FeedbackType = "like" | "favorite";

/**
 * Status of a user-submitted suggestion.
 */
export type SuggestionStatus = "pending" | "approved" | "rejected";

/**
 * Status of a route.
 */
export type RouteStatus = "active" | "draft" | "deleted";

/**
 * A Christmas lights display location.
 */
export interface Location {
  /** Unique identifier (UUID) */
  id: string;
  /** Street address */
  address: string;
  /** Latitude coordinate */
  lat: number;
  /** Longitude coordinate */
  lng: number;
  /** User-provided description */
  description: string;
  /** AI-generated description (from photo analysis) */
  aiDescription?: string;
  /** Array of S3 photo keys */
  photos: string[];
  /** Current status */
  status: LocationStatus;
  /** Number of likes */
  likeCount: number;
  /** Number of reports */
  reportCount: number;
  /** Number of views */
  viewCount: number;
  /** Number of saves/favorites */
  saveCount: number;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** User ID who created this location */
  createdBy?: string;
  /** Username of creator (denormalized) */
  createdByUsername?: string;
}

/**
 * DynamoDB representation of a location (includes partition keys).
 */
export interface LocationRecord extends Location {
  PK: string;
  SK: string;
}

/**
 * User feedback on a location (like or favorite).
 */
export interface Feedback {
  /** Unique identifier (UUID) */
  id: string;
  /** Location this feedback is for */
  locationId: string;
  /** User who submitted feedback */
  userId: string;
  /** Type of feedback */
  type: FeedbackType;
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * DynamoDB representation of feedback.
 */
export interface FeedbackRecord extends Feedback {
  PK: string;
  SK: string;
}

/**
 * User-submitted location suggestion (pending admin review).
 */
export interface Suggestion {
  /** Unique identifier (UUID) */
  id: string;
  /** Submitted address */
  address: string;
  /** Latitude (may be geocoded) */
  lat?: number;
  /** Longitude (may be geocoded) */
  lng?: number;
  /** User description */
  description: string;
  /** Array of S3 photo keys */
  photos: string[];
  /** Current review status */
  status: SuggestionStatus;
  /** User ID who submitted */
  submittedBy: string;
  /** Email of submitter */
  submittedByEmail?: string;
  /** Username of submitter */
  submittedByUsername?: string;
  /** ISO timestamp of submission */
  createdAt: string;
  /** ISO timestamp when reviewed */
  reviewedAt?: string;
  /** User ID of reviewer */
  reviewedBy?: string;
  /** Whether flagged for extra review */
  flaggedForReview?: boolean;
}

/**
 * DynamoDB representation of a suggestion.
 */
export interface SuggestionRecord extends Suggestion {
  PK: string;
  SK: string;
}

/**
 * A curated route of Christmas light locations.
 */
export interface Route {
  /** Unique identifier (UUID) */
  id: string;
  /** Route title */
  title: string;
  /** Route description */
  description: string;
  /** Ordered list of location IDs */
  locationIds: string[];
  /** Tags for categorization */
  tags: string[];
  /** User ID who created */
  createdBy: string;
  /** Username of creator (denormalized) */
  createdByUsername?: string;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Current status */
  status: RouteStatus;
  /** Whether publicly visible */
  isPublic: boolean;
  /** Number of likes */
  likeCount: number;
  /** Number of saves */
  saveCount: number;
  /** Number of times started/viewed */
  startCount: number;
  /** Number of stops */
  stopCount: number;
  /** Estimated time in minutes */
  estimatedMinutes: number;
  /** Total distance in miles */
  totalMiles: number;
}

/**
 * DynamoDB representation of a route.
 */
export interface RouteRecord extends Route {
  PK: string;
  SK: string;
}

/**
 * User feedback on a route (like or save).
 */
export interface RouteFeedback {
  /** Unique identifier (UUID) */
  id: string;
  /** Route this feedback is for */
  routeId: string;
  /** User who submitted feedback */
  userId: string;
  /** Type of feedback */
  type: "like" | "save";
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * DynamoDB representation of route feedback.
 */
export interface RouteFeedbackRecord extends RouteFeedback {
  PK: string;
  SK: string;
}

/**
 * User profile information.
 */
export interface UserProfile {
  /** Cognito user ID */
  userId: string;
  /** User email */
  email: string;
  /** Display username */
  username?: string;
  /** Full name */
  name?: string;
  /** Whether user is admin */
  isAdmin: boolean;
  /** ISO timestamp of creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt?: string;
}

/**
 * Report submitted by a user about a location.
 */
export interface Report {
  /** Unique identifier (UUID) */
  id: string;
  /** Location being reported */
  locationId: string;
  /** User who submitted report */
  userId: string;
  /** Reason/category for report */
  reason: string;
  /** Additional details */
  details?: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * Status of a live check-in.
 */
export type CheckInStatus = "on" | "off" | "amazing" | "changed";

/**
 * A live status check-in for a location.
 * Users at a location can report the current display status.
 */
export interface CheckIn {
  /** Unique identifier (UUID) */
  id: string;
  /** Location this check-in is for */
  locationId: string;
  /** User who submitted check-in */
  userId: string;
  /** Username of submitter (denormalized) */
  username: string;
  /** Current status of the display */
  status: CheckInStatus;
  /** Optional note about the display */
  note?: string;
  /** Optional S3 photo key for verification */
  photoKey?: string;
  /** ISO timestamp of creation */
  createdAt: string;
}

/**
 * DynamoDB representation of a check-in.
 */
export interface CheckInRecord extends CheckIn {
  PK: string;
  SK: string;
}
