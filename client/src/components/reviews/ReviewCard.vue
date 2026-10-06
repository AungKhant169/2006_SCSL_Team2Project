<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import PillBadge from '@/components/ui/PillBadge.vue'
import type { Review } from '@/types/review'
import { formatTimestamp } from '@/utils/format'

const props = defineProps<{
  review: Review
  /** The signed-in student's own review: highlighted, with Edit and Delete controls. */
  own?: boolean
}>()

defineEmits<{ edit: []; delete: [] }>()

const postedAt = computed(() =>
  props.review.updatedAt
    ? `${formatTimestamp(props.review.updatedAt)} (edited)`
    : formatTimestamp(props.review.createdAt),
)
</script>

<template>
  <article
    class="flex flex-col gap-1.5 rounded-[10px] border px-4 py-3.5"
    :class="own ? 'gap-2 border-primary bg-primary-faint' : 'border-line-soft'"
  >
    <div class="flex flex-wrap items-center justify-between gap-2.5">
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold">{{ review.username }}</span>
        <PillBadge v-if="own" variant="solid">Your review</PillBadge>
      </div>
      <time
        class="text-xs whitespace-nowrap text-muted"
        :datetime="review.updatedAt ?? review.createdAt"
      >
        {{ postedAt }}
      </time>
    </div>
    <p class="m-0 text-sm leading-[1.55] text-pretty text-[#26302f]">{{ review.text }}</p>
    <div v-if="own" class="flex gap-2 pt-1">
      <BaseButton variant="outline" size="sm" @click="$emit('edit')">Edit Review</BaseButton>
      <BaseButton variant="outline-danger" size="sm" @click="$emit('delete')">
        Delete Review
      </BaseButton>
    </div>
  </article>
</template>
