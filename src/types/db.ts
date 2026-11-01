// Hand-maintained types matching supabase/migrations. Regenerate or update when the schema changes.

export type Stage = 'first' | 'second' | 'third'
export type ContentKind = 'activity' | 'education' | 'story' | 'audio'
export type Category = 'voice' | 'story' | 'calm' | 'music' | 'family' | 'learn' | 'reflect'
export type VersionStatus =
  | 'draft'
  | 'in_review'
  | 'changes_requested'
  | 'approved'
  | 'published'
  | 'superseded'
  | 'withdrawn'
export type AdminRole = 'editor' | 'reviewer' | 'publisher' | 'operator'
export type Visibility = 'private' | 'shared'

export interface Preferences {
  categories?: Category[]
  use_mode?: 'solo' | 'shared'
}

export interface Profile {
  user_id: string
  display_name: string | null
  timezone: string | null
  preferences: Preferences
  content_paused: boolean
  onboarded_at: string | null
}

export interface MyContext {
  user_id: string
  profile: Profile
  admitted: boolean
  membership: { family_id: string; role: 'owner' | 'partner'; joined_at: string } | null
  pregnancy: {
    stage: Stage | null
    due_date: string | null
    share_with_partner: boolean
    nickname?: string | null
  } | null
  roles: AdminRole[]
  pending_deletion: boolean
}

export interface ContentVersion {
  id: string
  item_id: string
  version: number
  status: VersionStatus
  title: string
  summary: string
  body: string
  solo_steps: string
  together_steps: string
  reflection_prompt: string
  duration_minutes: number
  stages: Stage[]
  health_related: boolean
  is_placeholder: boolean
  audio_path: string | null
  transcript: string | null
  revision_note: string
  author_id: string | null
  created_at: string
  updated_at: string
  published_at: string | null
}

export interface ContentSource {
  id: string
  version_id: string
  title: string
  url: string
  accessed_on: string
}

export interface ContentItem {
  id: string
  slug: string
  kind: ContentKind
  category: Category
  is_sample: boolean
  program_position: number | null
  published_version_id: string | null
  withdrawn_at: string | null
  created_at: string
}

/** A published item joined with its published version. */
export interface PublishedItem extends ContentItem {
  version: ContentVersion
  sources: ContentSource[]
}

export interface ContentReview {
  id: string
  version_id: string
  reviewer_id: string | null
  review_type: 'editorial' | 'clinical'
  result: 'approved' | 'changes_requested'
  notes: string
  created_at: string
}

export interface Memory {
  id: string
  family_id: string
  author_id: string
  kind: 'text' | 'voice'
  title: string
  body: string
  activity_id: string | null
  visibility: Visibility
  state: 'active' | 'deleting'
  created_at: string
  updated_at: string
}

export interface Recording {
  id: string
  memory_id: string | null
  object_key: string
  mime: string
  reserved_bytes: number
  actual_bytes: number | null
  duration_seconds: number | null
  state: 'reserved' | 'active' | 'failed' | 'deleting'
  expires_at: string
}

export type PlanList = 'bag' | 'questions' | 'names'

export interface PlanItem {
  id: string
  family_id: string
  author_id: string
  list: PlanList
  label: string
  note: string
  done: boolean
  visibility: Visibility
  created_at: string
  updated_at: string
  /** User ids of everyone (visible to the caller) who hearted this name. */
  hearts: { user_id: string }[]
}

export interface FamilyOverview {
  family_id: string
  my_role: 'owner' | 'partner'
  members: { role: 'owner' | 'partner'; display_name: string; joined_at: string; is_me: boolean }[]
  pending_invitation: { expires_at: string; created_at: string } | null
  usage: {
    recordings: number
    recording_bytes: number
    text_memories: number
    max_recordings: number
    max_recording_bytes: number
    max_text_memories: number
  }
}
