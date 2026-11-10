<script setup lang="ts">
import { computed, watch } from 'vue'
import SavedSchoolCard from '@/components/schools/SavedSchoolCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useLocationStore } from '@/stores/location'
import { useProfileStore } from '@/stores/profile'

const bookmarks = useBookmarksStore()
const location = useLocationStore()
const profile = useProfileStore()

// Distances are measured from the postal code stored on the account (REQ-2.13), not from the
// directory's reference code, which a guest or a student without a profile starts at a sample.
watch(
  () => profile.savedPostal,
  (postal) => void location.locate(postal),
  { immediate: true },
)

/** The bookmarks with their distance from the saved postal code; none when there is no usable one. */
const saved = computed(() =>
  bookmarks.schools.map((school) => location.withDistance(school, profile.savedPostal)),
)

const hasPostal = computed(() => location.originOf(profile.savedPostal) !== null)

const subtitle = computed(() =>
  hasPostal.value
    ? `Distances from your saved postal code ${profile.savedPostal}.`
    : 'Add a postal code in your profile to see distances.',
)
</script>

<template>
  <div data-demo="saved-schools" class="page">
    <PageHeader title="Saved institutions" :subtitle="subtitle">
      <LinkButton :to="{ name: 'directory' }" variant="outline">Browse directory</LinkButton>
    </PageHeader>

    <ul
      v-if="saved.length > 0"
      class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-3.5 p-0"
    >
      <li v-for="school in saved" :key="school.id">
        <SavedSchoolCard :school="school" class="h-full" @remove="bookmarks.remove(school.id)" />
      </li>
    </ul>

    <EmptyState
      v-else
      title="No saved institutions yet"
      message="Bookmark schools from the directory to compare distance and entry benchmarks here."
    >
      <LinkButton :to="{ name: 'directory' }" class="mt-2">Go to directory</LinkButton>
    </EmptyState>
  </div>
</template>
