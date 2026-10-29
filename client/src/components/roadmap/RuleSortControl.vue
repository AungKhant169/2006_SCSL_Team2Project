<script setup lang="ts">
import { computed, ref, useId, watch } from 'vue'
import { describeDistanceLimit, DISTANCE_LIMIT, RULE_SORT_OPTIONS } from '@/data/ruleSort'
import { useRoadmapStore } from '@/stores/roadmap'
import type { RuleSort } from '@/types/roadmap'

const roadmap = useRoadmapStore()
const name = useId()
const sliderId = useId()

const sort = computed<RuleSort>({
  get: () => roadmap.ruleSort,
  set: roadmap.setRuleSort,
})

// The slider follows the pointer, but the plan is only ranked again once it is let go.
const draft = ref(roadmap.ruleDistance)
watch(
  () => roadmap.ruleDistance,
  (km) => (draft.value = km),
)
</script>

<template>
  <div v-if="roadmap.ruleSorts.length > 1" class="flex flex-col gap-3 panel bg-primary-faint p-3.5">
    <fieldset class="m-0 border-0 p-0">
      <legend class="caps-label p-0">Rank by</legend>
      <div class="mt-1.5 flex flex-wrap gap-x-5 gap-y-2">
        <label
          v-for="option in RULE_SORT_OPTIONS"
          :key="option.value"
          class="flex cursor-pointer items-center gap-2 text-sm font-semibold"
        >
          <input
            v-model="sort"
            type="radio"
            :name="name"
            :value="option.value"
            class="accent-primary"
          />
          {{ option.label }}
        </label>
      </div>
    </fieldset>

    <div v-if="sort === 'grade'" class="field">
      <div class="flex items-baseline justify-between gap-3">
        <label :for="sliderId" class="field-label">Acceptable distance</label>
        <output :for="sliderId" class="text-[13px] font-semibold text-primary">
          {{ describeDistanceLimit(draft) }}
        </output>
      </div>
      <input
        :id="sliderId"
        type="range"
        class="w-full accent-primary"
        :min="DISTANCE_LIMIT.min"
        :max="DISTANCE_LIMIT.max"
        :step="DISTANCE_LIMIT.step"
        :value="draft"
        :aria-valuetext="describeDistanceLimit(draft)"
        @input="draft = Number(($event.target as HTMLInputElement).value)"
        @change="roadmap.setRuleDistance(draft)"
      />
      <div class="flex justify-between text-xs text-muted">
        <span>{{ DISTANCE_LIMIT.min }} km</span>
        <span>Any distance</span>
      </div>
    </div>
  </div>

  <p v-else-if="roadmap.ruleSorts.length === 1" class="m-0 text-[13px] text-muted">
    Ranked by distance only: this stage has no grade to rank by.
  </p>
</template>
