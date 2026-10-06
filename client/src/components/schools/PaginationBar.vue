<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import { PAGE_SIZE } from '@/utils/schoolSearch'

defineProps<{
  page: number
  pageCount: number
}>()

defineEmits<{ previous: []; next: [] }>()
</script>

<template>
  <nav
    aria-label="Pagination"
    class="flex items-center justify-between pt-1.5 text-[13px] text-muted"
  >
    <span>Page {{ page }} of {{ pageCount }} · {{ PAGE_SIZE }} per page</span>
    <div class="flex gap-1.5">
      <BaseButton variant="outline" size="sm" :disabled="page <= 1" @click="$emit('previous')">
        Previous
      </BaseButton>
      <BaseButton variant="outline" size="sm" :disabled="page >= pageCount" @click="$emit('next')">
        Next
      </BaseButton>
    </div>
  </nav>
</template>
