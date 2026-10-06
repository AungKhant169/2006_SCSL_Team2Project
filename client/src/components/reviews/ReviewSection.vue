<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useReviewsStore } from '@/stores/reviews'
import { useUiStore } from '@/stores/ui'
import ReviewCard from './ReviewCard.vue'
import ReviewComposer from './ReviewComposer.vue'

const props = defineProps<{ schoolId: number }>()

const auth = useAuthStore()
const reviews = useReviewsStore()
const ui = useUiStore()
const router = useRouter()

const draft = ref('')
const editing = ref(false)
const error = ref('')

const schoolReviews = computed(() => reviews.forSchool(props.schoolId))
const own = computed(() =>
  auth.loggedIn ? reviews.ownReview(props.schoolId, auth.username) : undefined,
)
const others = computed(() => schoolReviews.value.filter((r) => r.id !== own.value?.id))
/** One review per account: the composer only shows until the student has posted (BR-6). */
const showComposer = computed(() => auth.loggedIn && (!own.value || editing.value))

function resetComposer() {
  draft.value = ''
  editing.value = false
  error.value = ''
}

function submit() {
  const message =
    editing.value && own.value
      ? reviews.edit(own.value.id, auth.username, draft.value)
      : reviews.submit(props.schoolId, auth.username, draft.value)
  if (message) error.value = message
  else resetComposer()
}

function startEdit() {
  if (!own.value) return
  draft.value = own.value.text
  error.value = ''
  editing.value = true
}

function askDelete() {
  const review = own.value
  if (!review) return
  ui.openModal('delReview', () => {
    reviews.remove(review.id, auth.username)
    resetComposer()
  })
}

function askToLogIn() {
  ui.openModal('guestReview', async () => {
    await router.push({ name: 'login' })
    ui.setNotice('Log in or create an account to post a review.')
  })
}
</script>

<template>
  <SectionCard>
    <header class="flex flex-wrap items-baseline justify-between gap-3">
      <h2 class="section-title-lg">
        Reviews <span class="font-medium text-muted">({{ schoolReviews.length }})</span>
      </h2>
      <span class="text-xs text-muted">One review per school per account · newest first</span>
    </header>

    <div
      v-if="!auth.loggedIn"
      class="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-dashed border-control bg-surface px-4 py-3.5"
    >
      <span class="text-sm text-soft">Reviews are open to account holders only.</span>
      <BaseButton @click="askToLogIn">Write a review</BaseButton>
    </div>

    <ReviewComposer
      v-if="showComposer"
      v-model="draft"
      :title="editing ? 'Edit your review' : `Write a review as ${auth.username}`"
      :submit-label="editing ? 'Update Review' : 'Submit Review'"
      :cancellable="editing"
      :error="error"
      @submit="submit"
      @cancel="resetComposer"
    />

    <ReviewCard v-if="own && !editing" :review="own" own @edit="startEdit" @delete="askDelete" />

    <ul v-if="others.length > 0" class="m-0 flex list-none flex-col gap-2.5 p-0">
      <li v-for="review in others" :key="review.id">
        <ReviewCard :review="review" />
      </li>
    </ul>

    <div
      v-if="schoolReviews.length === 0"
      class="rounded-[10px] border border-dashed border-control p-7 text-center text-sm text-muted"
    >
      No reviews yet
    </div>
  </SectionCard>
</template>
