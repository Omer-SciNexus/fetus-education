// Typed data access. Authorization is enforced by the database (RLS + functions);
// nothing here is a security boundary.
import { supabase } from './supabase'
import type {
  ContentItem,
  ContentReview,
  ContentSource,
  ContentVersion,
  FamilyOverview,
  Memory,
  MyContext,
  PlanItem,
  PlanList,
  Preferences,
  PublishedItem,
  Recording,
  Stage,
  Visibility,
} from '@/types/db'

function unwrap<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error
  return res.data as T
}

// ---------------------------------------------------------------- context
export async function getMyContext(): Promise<MyContext> {
  return unwrap(await supabase.rpc('get_my_context')) as MyContext
}

export async function createFamily(): Promise<string> {
  return unwrap(await supabase.rpc('create_family')) as string
}

export async function completeOnboarding(input: {
  displayName: string
  timezone: string
  preferences: Preferences
  stage: Stage | null
  dueDate: string | null
  policyVersion: string
}) {
  unwrap(
    await supabase.rpc('complete_onboarding', {
      p_display_name: input.displayName,
      p_timezone: input.timezone,
      p_preferences: input.preferences,
      p_stage: input.stage,
      p_due_date: input.dueDate,
      p_policy_version: input.policyVersion,
    }),
  )
}

export async function updateProfile(
  userId: string,
  patch: Partial<{ display_name: string | null; preferences: Preferences; content_paused: boolean; timezone: string }>,
) {
  unwrap(await supabase.from('profiles').update(patch).eq('user_id', userId))
}

export async function updatePregnancy(
  familyId: string,
  patch: Partial<{ stage: Stage | null; due_date: string | null; share_with_partner: boolean; nickname: string | null }>,
) {
  unwrap(await supabase.from('pregnancy_profiles').update(patch).eq('family_id', familyId))
}

// ---------------------------------------------------------------- content
const PUBLISHED_SELECT =
  '*, version:content_versions!content_items_published_version_fk(*, sources:content_sources(*))'

type RawPublished = ContentItem & { version: (ContentVersion & { sources: ContentSource[] }) | null }

function toPublished(rows: RawPublished[]): PublishedItem[] {
  return rows
    .filter((r) => r.version && r.version.status === 'published' && !r.withdrawn_at)
    .map((r) => ({ ...r, version: r.version!, sources: r.version!.sources ?? [] }))
}

/** Published content the caller may read (RLS: guests get samples only). */
export async function listPublished(): Promise<PublishedItem[]> {
  const rows = unwrap(
    await supabase
      .from('content_items')
      .select(PUBLISHED_SELECT)
      .not('published_version_id', 'is', null)
      .is('withdrawn_at', null)
      .order('program_position', { ascending: true, nullsFirst: false })
      .order('slug'),
  ) as RawPublished[]
  return toPublished(rows)
}

export async function listSamples(): Promise<PublishedItem[]> {
  const rows = unwrap(
    await supabase
      .from('content_items')
      .select(PUBLISHED_SELECT)
      .eq('is_sample', true)
      .not('published_version_id', 'is', null)
      .is('withdrawn_at', null)
      .order('program_position', { ascending: true, nullsFirst: false }),
  ) as RawPublished[]
  return toPublished(rows)
}

export async function getPublishedBySlug(slug: string): Promise<PublishedItem | null> {
  const rows = unwrap(
    await supabase.from('content_items').select(PUBLISHED_SELECT).eq('slug', slug).limit(1),
  ) as RawPublished[]
  return toPublished(rows)[0] ?? null
}

export async function getReviewSummary(versionId: string) {
  return unwrap(await supabase.rpc('content_review_summary', { p_version: versionId })) as {
    review_type: 'editorial' | 'clinical'
    reviewed_at: string
    reviewer_name: string
  }[]
}

// ---------------------------------------------------------------- progress
export async function listProgress(): Promise<{ item_id: string; completed_at: string }[]> {
  return unwrap(await supabase.from('activity_progress').select('item_id, completed_at'))
}

export async function completeActivity(itemId: string) {
  unwrap(await supabase.rpc('complete_activity', { p_item: itemId }))
}

export async function undoCompletion(userId: string, itemId: string) {
  unwrap(await supabase.from('activity_progress').delete().eq('user_id', userId).eq('item_id', itemId))
}

export async function listFavorites(): Promise<{ item_id: string }[]> {
  return unwrap(await supabase.from('favorites').select('item_id'))
}

export async function setFavorite(userId: string, itemId: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from('favorites').insert({ user_id: userId, item_id: itemId })
    // Duplicate favourite = already on.
    if (error && (error as { code?: string }).code !== '23505') throw error
  } else {
    unwrap(await supabase.from('favorites').delete().eq('user_id', userId).eq('item_id', itemId))
  }
}

export async function logEvent(type: 'activity_started' | 'memory_revisited' | 'save_failed') {
  // Reporting must never break the experience.
  try {
    await supabase.rpc('log_event', { p_type: type })
  } catch {
    /* ignore */
  }
}

// ---------------------------------------------------------------- memories
export async function listMemories(): Promise<Memory[]> {
  return unwrap(await supabase.from('memories').select('*').order('created_at', { ascending: false }))
}

export async function getMemory(id: string): Promise<Memory | null> {
  return unwrap(await supabase.from('memories').select('*').eq('id', id).maybeSingle())
}

export async function getRecordingForMemory(memoryId: string): Promise<Recording | null> {
  return unwrap(
    await supabase
      .from('recordings')
      .select('id, memory_id, object_key, mime, reserved_bytes, actual_bytes, duration_seconds, state, expires_at')
      .eq('memory_id', memoryId)
      .maybeSingle(),
  )
}

export async function listMyRecordings(userId: string): Promise<Recording[]> {
  return unwrap(
    await supabase
      .from('recordings')
      .select('id, memory_id, object_key, mime, reserved_bytes, actual_bytes, duration_seconds, state, expires_at')
      .eq('author_id', userId)
      .eq('state', 'active'),
  )
}

export async function createTextMemory(input: {
  title: string
  body: string
  visibility: Visibility
  activityId: string | null
}): Promise<string> {
  return unwrap(
    await supabase.rpc('create_text_memory', {
      p_title: input.title,
      p_body: input.body,
      p_visibility: input.visibility,
      p_activity: input.activityId,
    }),
  ) as string
}

export async function updateMemory(id: string, patch: { title?: string; body?: string; visibility?: Visibility }) {
  unwrap(await supabase.from('memories').update(patch).eq('id', id))
}

// ---------------------------------------------------------------- family plan
export async function listPlanItems(): Promise<PlanItem[]> {
  return unwrap(
    await supabase
      .from('family_list_items')
      .select('*, hearts:name_hearts(user_id)')
      .order('created_at', { ascending: true }),
  ) as PlanItem[]
}

export async function addPlanItem(input: {
  list: PlanList
  label: string
  note: string
  visibility: Visibility
}): Promise<string> {
  return unwrap(
    await supabase.rpc('add_list_item', {
      p_list: input.list,
      p_label: input.label,
      p_note: input.note,
      p_visibility: input.visibility,
    }),
  ) as string
}

export async function setPlanItemDone(id: string, done: boolean) {
  unwrap(await supabase.rpc('set_list_item_done', { p_item: id, p_done: done }))
}

export async function updatePlanItem(id: string, patch: { label?: string; note?: string; visibility?: Visibility }) {
  unwrap(await supabase.from('family_list_items').update(patch).eq('id', id))
}

export async function deletePlanItem(id: string) {
  unwrap(await supabase.from('family_list_items').delete().eq('id', id))
}

export async function setNameHeart(userId: string, itemId: string, on: boolean) {
  if (on) {
    const { error } = await supabase.from('name_hearts').insert({ user_id: userId, item_id: itemId })
    // Duplicate heart = already on.
    if (error && (error as { code?: string }).code !== '23505') throw error
  } else {
    unwrap(await supabase.from('name_hearts').delete().eq('user_id', userId).eq('item_id', itemId))
  }
}

// ---------------------------------------------------------------- family
export async function getFamilyOverview(): Promise<FamilyOverview | null> {
  return unwrap(await supabase.rpc('get_family_overview')) as FamilyOverview | null
}

export async function createInvitation(): Promise<{ token: string; expires_at: string }> {
  const data = unwrap(await supabase.rpc('create_invitation')) as { token: string; expires_at: string }[]
  return data[0]
}

export async function revokeInvitation() {
  unwrap(await supabase.rpc('revoke_invitation'))
}

export async function acceptInvitation(token: string): Promise<string> {
  return unwrap(await supabase.rpc('accept_invitation', { p_token: token })) as string
}

export async function revokePartner() {
  unwrap(await supabase.rpc('revoke_partner'))
}

export async function leaveFamily() {
  unwrap(await supabase.rpc('leave_family'))
}

// ---------------------------------------------------------------- privacy
export async function exportMyData(): Promise<unknown> {
  return unwrap(await supabase.rpc('export_my_data'))
}

export async function requestAccountDeletion(): Promise<{ status: string }> {
  const { data, error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
  if (error) {
    // Surface the function's error code (e.g. reauth_required) when present.
    const ctx = (error as { context?: Response }).context
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = (await ctx.json()) as { error?: string }
        if (body.error) throw new Error(body.error)
      } catch (e) {
        if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e
      }
    }
    throw error
  }
  return data as { status: string }
}

// ---------------------------------------------------------------- admin
export interface AdminItem extends ContentItem {
  versions: ContentVersion[]
}

export async function adminListItems(): Promise<AdminItem[]> {
  return unwrap(
    await supabase
      .from('content_items')
      .select('*, versions:content_versions!content_versions_item_id_fkey(*)')
      .order('kind')
      .order('program_position', { ascending: true, nullsFirst: false })
      .order('slug'),
  )
}

export async function adminGetItem(id: string): Promise<AdminItem | null> {
  return unwrap(
    await supabase
      .from('content_items')
      .select('*, versions:content_versions!content_versions_item_id_fkey(*)')
      .eq('id', id)
      .maybeSingle(),
  )
}

export async function adminListReviews(versionIds: string[]): Promise<ContentReview[]> {
  if (!versionIds.length) return []
  return unwrap(await supabase.from('content_reviews').select('*').in('version_id', versionIds).order('created_at'))
}

export async function adminListSources(versionId: string): Promise<ContentSource[]> {
  return unwrap(await supabase.from('content_sources').select('*').eq('version_id', versionId))
}

export async function adminAddSource(versionId: string, title: string, url: string) {
  unwrap(await supabase.from('content_sources').insert({ version_id: versionId, title, url }))
}

export async function adminRemoveSource(id: string) {
  unwrap(await supabase.from('content_sources').delete().eq('id', id))
}

export async function adminUpdateDraft(versionId: string, patch: Partial<ContentVersion>) {
  unwrap(await supabase.from('content_versions').update(patch).eq('id', versionId))
}

export async function adminRpc(fn: string, args: Record<string, unknown> = {}) {
  return unwrap(await supabase.rpc(fn, args))
}

export async function adminListAdmissions(): Promise<{ email: string; note: string | null; created_at: string }[]> {
  return unwrap(await supabase.from('pilot_admissions').select('email, note, created_at').order('created_at'))
}

export async function adminAddAdmission(email: string, note: string, adminId: string) {
  unwrap(
    await supabase
      .from('pilot_admissions')
      .insert({ email: email.trim().toLowerCase(), note: note || null, admitted_by: adminId }),
  )
}

export async function adminRemoveAdmission(email: string) {
  unwrap(await supabase.from('pilot_admissions').delete().eq('email', email))
}

export async function adminListLicenses() {
  return unwrap(await supabase.from('asset_licenses').select('*').order('asset_path')) as {
    id: string
    asset_path: string
    title: string
    creator: string
    license: string
    attribution: string
    allowed_uses: string
  }[]
}

export async function adminAddLicense(row: {
  asset_path: string
  title: string
  creator: string
  license: string
  attribution: string
  allowed_uses: string
}) {
  unwrap(await supabase.from('asset_licenses').insert(row))
}

export async function adminListAudit(): Promise<
  { id: number; action: string; target_id: string | null; outcome: string; created_at: string }[]
> {
  return unwrap(
    await supabase
      .from('admin_audit_events')
      .select('id, action, target_id, outcome, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  )
}
