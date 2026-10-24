<script setup lang="ts">
import { computed } from 'vue'
import SavedSchoolCard from '@/components/schools/SavedSchoolCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useDirectoryStore } from '@/stores/directory'
import { useLocationStore } from '@/stores/location'

const bookmarks = useBookmarksStore()
const directory = useDirectoryStore()
const location = useLocationStore()

/** The bookmarks with their distance from the directory's reference postal code. */
const saved = computed(() =>
  bookmarks.schools.map((school) => location.withDistance(school, directory.postal)),
)

const subtitle = computed(() =>
  directory.hasPostal
    ? `Distances from your saved postal code ${directory.postal}.`
    : 'Add a postal code in your profile to see distances.',
)
</script>

<template>
  <div class="page">
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
