// Maps backend error codes (raised by supabase/migrations functions) to plain messages.

const messages: Record<string, string> = {
  not_authenticated: 'Please sign in again.',
  not_admitted:
    'This Google account is not on the pilot list yet. If you were invited as a partner, open the invitation link you were sent.',
  pilot_full: 'The pilot is currently full. Thank you for your interest.',
  already_member: 'This account already belongs to a family.',
  not_member: 'You need to be part of a family to do this.',
  not_owner: 'Only the account owner can do this.',
  not_partner: 'Only a partner can leave a family.',
  partner_exists: 'This family already has a partner.',
  rate_limited: 'Too many invitations today. Please try again tomorrow.',
  invitation_invalid: 'This invitation link is not valid. Ask for a new one.',
  invitation_used: 'This invitation has already been used.',
  invitation_revoked: 'This invitation was cancelled. Ask for a new one.',
  invitation_expired: 'This invitation has expired. Ask for a new one.',
  content_unavailable: 'This content is not available.',
  memory_empty: 'Write something before saving.',
  memory_too_long: 'Memories can be up to 2,000 characters.',
  text_memory_limit: 'Your family has reached the pilot limit of 100 written memories.',
  file_too_large: 'This recording is larger than 2 MB. Try a shorter recording.',
  unsupported_audio: 'This browser recorded audio in a format we cannot store.',
  upload_in_progress: 'Another recording is still uploading. Finish or discard it first.',
  recording_limit: 'Your family has reached the pilot limit of 10 recordings. Delete one to record another.',
  storage_limit: 'Your family has reached its recording storage limit.',
  reservation_failed: 'That save attempt can no longer be used. Please save again.',
  reservation_invalid: 'That upload can no longer be completed. Please try again.',
  upload_missing: 'The recording did not finish uploading. Please try again.',
  upload_invalid: 'The uploaded recording could not be verified.',
  object_exists: 'Cleanup is still in progress. Please try again.',
  not_found: 'This item could not be found.',
  forbidden: 'You do not have permission to do this.',
  invalid_status: 'This version is not in the right state for that action.',
  not_approved: 'Only approved versions can be published.',
  sources_required: 'Health-related content needs at least one source before publishing.',
  license_required: 'Add a rights record for this audio before publishing.',
  content_version_locked: 'Reviewed versions cannot be edited. Create a new version instead.',
  user_not_found: 'No account with that email has signed in yet.',
  reauth_required: 'For your security, please sign in again to confirm.',
  invalid_list: 'That list is not available.',
  list_item_empty: 'Write something before adding it.',
  list_item_too_long: 'Keep entries to 120 characters, with notes up to 300.',
  list_item_limit: 'Your family has reached the pilot limit of 300 plan entries.',
}

export function errorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const msg = (error as { message?: unknown }).message
  if (typeof msg !== 'string') return null
  const code = msg.trim()
  return code in messages ? code : null
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = errorCode(error)
  if (code) return messages[code]
  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return 'We could not reach Little Bloom. Check your connection and try again.'
  }
  return fallback
}

export class AppError extends Error {
  constructor(code: string) {
    super(code)
    this.name = 'AppError'
  }
}
