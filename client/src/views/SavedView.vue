<script setup lang="ts">
import { computed } from 'vue'
import SavedSchoolCard from '@/components/schools/SavedSchoolCard.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LinkButton from '@/components/ui/LinkButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useBookmarksStore } from '@/stores/bookmarks'
import { useDirectoryStore } from '@/stores/directory'

const bookmarks = useBookmarksStore()
const directory = useDirectoryStore()

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
      v-if="bookmarks.schools.length > 0"
      class="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-3.5 p-0"
    >
      <li v-for="school in bookmarks.schools" :key="school.id">
        <SavedSchoolCard
          :school="school"
          :has-postal="directory.hasPostal"
          class="h-full"
          @remove="bookmarks.remove(school.id)"
        />
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
