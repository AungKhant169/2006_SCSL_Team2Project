<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useAuthStore } from '@/stores/auth'
import { useBookmarksStore } from '@/stores/bookmarks'

const props = withDefaults(defineProps<{ schoolId: number; size?: 'sm' | 'md' }>(), {
  size: 'sm',
})

const auth = useAuthStore()
const bookmarks = useBookmarksStore()
const saved = computed(() => bookmarks.has(props.schoolId))
</script>

<template>
  <!-- Bookmarks are for signed-in students only; guests never see the control (UC-2.5, BR-2). -->
  <BaseButton
    v-if="auth.loggedIn"
    :variant="saved ? 'primary' : 'outline-primary'"
    :size="size"
    title="Bookmark"
    :aria-pressed="saved"
    @click.stop="bookmarks.toggle(schoolId)"
  >
    {{ saved ? '★ Saved' : '☆ Save' }}
  </BaseButton>
</template>
