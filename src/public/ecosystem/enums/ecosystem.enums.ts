/**
 * ═══════════════════════════════════════════════════
 *  Telyon Ecosystem Enums
 * ═══════════════════════════════════════════════════
 *
 *  These enums govern the ecosystem-level lifecycle,
 *  workspace operational status, and contribution
 *  impact tracking across the Telyon platform.
 *
 *  Domain separation:
 *   - ProfileLifecycleState  → Network / Public layer
 *   - WorkspaceStatus        → ERP capability layer
 *   - EcosystemContributionType → Platform-wide impact tracking
 */

// ─── Public Profile Lifecycle ────────────────────
// Represents the maturity / visibility lifecycle of
// a church's PUBLIC network presence.
//
//  DISCOVERED  →  user added the church to the map
//  CLAIM_PENDING → someone submitted a claim
//  CLAIMED     →  claim approved, owner assigned
//  VERIFIED    →  platform verified identity
//  ERP_ENABLED →  this public presence has an active
//                 ERP workspace capability attached
//  BLOCKED     →  suspended by platform admin
// ─────────────────────────────────────────────────

// ─── Geographic Precision ────────────────────────
// Defines the precision level of the public church coordinates.
// ─────────────────────────────────────────────────
export enum GeoPrecision {
  EXACT = 'EXACT',
  APPROXIMATE = 'APPROXIMATE',
  CITY_LEVEL = 'CITY_LEVEL',
  UNKNOWN = 'UNKNOWN',
}

// ─── Workspace Operational Status ────────────────
// Governs whether the ERP capability layer is
// currently operational for a given church.
// ─────────────────────────────────────────────────
export enum WorkspaceStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

// ─── Ecosystem Contribution Types ────────────────
// Canonical event types for ecosystem impact tracking.
//
// This is NOT social vanity metrics.
// This is ecosystem expansion impact tracking.
//
// Append-only event log. No updates, no deletes.
// ─────────────────────────────────────────────────
export enum EcosystemContributionType {
  // Invitaciones concretadas
  USER_INVITED = 'USER_INVITED',
  CHURCH_ADMIN_INVITED = 'CHURCH_ADMIN_INVITED',
  CHURCH_MEMBER_INVITED = 'CHURCH_MEMBER_INVITED',
  NEED_SIGNAL_INVITED = 'NEED_SIGNAL_INVITED',

  // Iglesias
  CHURCH_ADDED = 'CHURCH_ADDED',
  DOCTRINAL_OPINION_SUBMITTED = 'DOCTRINAL_OPINION_SUBMITTED',

  // Necesidades
  CHURCH_NEED_SIGNAL_CREATED = 'CHURCH_NEED_SIGNAL_CREATED',
  CHURCH_NEED_SIGNAL_SUPPORTED = 'CHURCH_NEED_SIGNAL_SUPPORTED',
  UNREACHED_AREA_CREATED = 'UNREACHED_AREA_CREATED',
  NEED_INFORMATION_ADDED = 'NEED_INFORMATION_ADDED',
  PERSONAL_NEED_ASSISTED = 'PERSONAL_NEED_ASSISTED',
}

// ─── Ecosystem Activity Types ────────────────────
// Defines the events that are shown in the public
// activity feeds.
// ─────────────────────────────────────────────────
export enum EcosystemActivityType {
  // Iglesias
  CHURCH_ADDED = 'CHURCH_ADDED',
  CHURCH_CLAIM_APPROVED = 'CHURCH_CLAIM_APPROVED',
  CHURCH_INFO_UPDATED = 'CHURCH_INFO_UPDATED',
  SMALL_GROUP_CREATED = 'SMALL_GROUP_CREATED',
  SMALL_GROUP_CLOSED = 'SMALL_GROUP_CLOSED',
  WORKSHOP_CREATED = 'WORKSHOP_CREATED',
  PUBLIC_ACTIVITY_CREATED = 'PUBLIC_ACTIVITY_CREATED',

  // Personas y Comunidad
  MEMBER_JOINED = 'MEMBER_JOINED',
  FOLLOWER_JOINED = 'FOLLOWER_JOINED',

  // Misiones
  MISSION_CREATED = 'MISSION_CREATED',
  MISSION_JOINED = 'MISSION_JOINED',
  MISSION_PAUSED = 'MISSION_PAUSED',
  MISSION_RESUMED = 'MISSION_RESUMED',
  MISSION_UPDATE_POSTED = 'MISSION_UPDATE_POSTED',
  MISSION_COMPLETED = 'MISSION_COMPLETED',
  MISSION_CANCELLED = 'MISSION_CANCELLED',
  MISSION_NEED_CREATED = 'MISSION_NEED_CREATED',
  MISSION_NEED_FULFILLED = 'MISSION_NEED_FULFILLED',

  // Necesidades
  CHURCH_NEED_SIGNAL_CREATED = 'CHURCH_NEED_SIGNAL_CREATED',
  NEED_SIGNAL_CREATED = 'NEED_SIGNAL_CREATED',
  NEED_INFORMATION_ADDED = 'NEED_INFORMATION_ADDED',
  NEED_ENGAGEMENT_STARTED = 'NEED_ENGAGEMENT_STARTED',
  NEED_SIGNAL_CONTACT_ACCEPTED = 'NEED_SIGNAL_CONTACT_ACCEPTED',
  NEED_SIGNAL_RESOLVED = 'NEED_SIGNAL_RESOLVED',
  NEED_SIGNAL_DEACTIVATED = 'NEED_SIGNAL_DEACTIVATED',

  // Zonas No Alcanzadas
  UNREACHED_AREA_CREATED = 'UNREACHED_AREA_CREATED',
  UNREACHED_AREA_REACHED = 'UNREACHED_AREA_REACHED',

  // Doctrinal
  DOCTRINAL_OPINION_ADDED = 'DOCTRINAL_OPINION_ADDED',
}

// ─── Ecosystem Activity Entity Types ─────────────
// The target entity types for the activity.
// ─────────────────────────────────────────────────
export enum EcosystemActivityEntityType {
  CHURCH = 'CHURCH',
  PERSON = 'PERSON',
  MISSION_PROJECT = 'MISSION_PROJECT',
  MISSION_COLLABORATION = 'MISSION_COLLABORATION',
  MISSION_NEED = 'MISSION_NEED',
  UNREACHED_AREA = 'UNREACHED_AREA',
  NEED_SIGNAL = 'NEED_SIGNAL',
  CHURCH_NEED_SIGNAL = 'CHURCH_NEED_SIGNAL',
  DOCTRINAL_OPINION = 'DOCTRINAL_OPINION',
  SMALL_GROUP = 'SMALL_GROUP',
  PUBLIC_ACTIVITY = 'PUBLIC_ACTIVITY',
}
