<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import PillBadge from '@/components/ui/PillBadge.vue'
import { useAuthStore } from '@/stores/auth'
import { useBookmarksStore } from '@/stores/bookmarks'

/** `row` for the desktop header, `column` for the mobile menu with 44px touch targets. */
const props = withDefaults(defineProps<{ orientation?: 'row' | 'column' }>(), {
  orientation: 'row',
})

const auth = useAuthStore()
const bookmarks = useBookmarksStore()
const router = useRouter()

const isColumn = computed(() => props.orientation === 'column')

interface NavItem {
  name: string
  label: string
  visible: boolean
  /** Shown as a badge next to the label when set. */
  count?: number
}

// Roadmap stays visible to guests; opening it sends them to log in.
const items = computed<NavItem[]>(() =>
  [
    { name: 'directory', label: 'Directory', visible: true },
    { name: 'roadmap', label: 'Roadmap', visible: true },
    { name: 'saved', label: 'Saved', visible: auth.loggedIn, count: bookmarks.count },
    { name: 'profile', label: 'My profile', visible: auth.loggedIn },
    { name: 'admin', label: 'Admin panel', visible: auth.isAdmin },
  ].filter((item) => item.visible),
)

async function logOut() {
  await auth.logout()
  await router.push({ name: 'directory' })
}
</script>

<template>
  <nav
    aria-label="Main"
    class="flex"
    :class="isColumn ? 'flex-col gap-0.5 px-3 pt-2 pb-3' : 'flex-wrap items-center gap-1'"
  >
    <RouterLink
      v-for="item in items"
      :key="item.name"
      :to="{ name: item.name }"
      class="nav-link"
      exact-active-class="nav-link-active"
      :class="{
        'min-h-11 py-3 text-[15px]': isColumn,
        'justify-between': isColumn && item.count !== undefined,
      }"
    >
      {{ item.label }}
      <PillBadge v-if="item.count !== undefined" variant="solid" data-testid="saved-count">
        {{ item.count }}
      </PillBadge>
    </RouterLink>

    <BaseButton
      v-if="auth.loggedIn"
      variant="outline"
      size="sm"
      class="font-normal"
      :class="isColumn ? 'mt-1.5 min-h-11 justify-start text-sm' : 'ml-2'"
      @click="logOut"
    >
      <span class="size-2 rounded-full bg-success" aria-hidden="true" />
      {{ auth.username }} · Log out
    </BaseButton>
    <RouterLink
      v-else
      :to="{ name: 'login' }"
      class="btn btn-primary hover:text-white hover:no-underline"
      :class="isColumn ? 'mt-1.5 min-h-11 text-[15px]' : 'ml-2 text-sm'"
    >
      Log in
    </RouterLink>
  </nav>
</template>
