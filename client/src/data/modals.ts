export type ModalId =
  'postal' | 'overwrite' | 'delRoadmap' | 'delReview' | 'guestReview' | 'timeout' | 'parse'

export interface ModalDefinition {
  title: string
  body: string
  /** Label of the confirming action. Absent for informational dialogs. */
  confirm?: string
  cancel: string
  /** Destructive actions are rendered in the danger colour. */
  tone: 'primary' | 'danger'
}

export const MODALS: Record<ModalId, ModalDefinition> = {
  postal: {
    title: 'Missing Profile Information',
    body: 'Please enter your postal code in your profile before generating a roadmap.',
    confirm: 'Go to my profile',
    cancel: 'Close',
    tone: 'primary',
  },
  overwrite: {
    title: 'Overwrite your saved roadmap?',
    body: 'Only one roadmap can be saved per account. Saving this plan will replace the roadmap currently stored on your profile.',
    confirm: 'Overwrite roadmap',
    cancel: 'Cancel',
    tone: 'primary',
  },
  delRoadmap: {
    title: 'Delete saved roadmap?',
    body: 'This removes the roadmap from your profile. There is no undo — you can always generate a new one.',
    confirm: 'Delete roadmap',
    cancel: 'Cancel',
    tone: 'danger',
  },
  delReview: {
    title: 'Delete your review?',
    body: 'Your review will be removed from this school profile permanently.',
    confirm: 'Delete review',
    cancel: 'Cancel',
    tone: 'danger',
  },
  guestReview: {
    title: 'Log in to post a review',
    body: 'Please log in or create an account to post a review.',
    confirm: 'Log in',
    cancel: 'Not now',
    tone: 'primary',
  },
  timeout: {
    title: 'Database Update Failed',
    body: 'Unable to reach API. Please try again.',
    cancel: 'Close',
    tone: 'danger',
  },
  parse: {
    title: 'Database Update Failed',
    body: 'Unable to process dataset format. Please check source data and try again.',
    cancel: 'Close',
    tone: 'danger',
  },
}
