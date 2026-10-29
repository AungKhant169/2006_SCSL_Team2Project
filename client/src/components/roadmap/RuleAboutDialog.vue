<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import ModalDialog from '@/components/ui/ModalDialog.vue'
import { getLevel } from '@/data/education'
import { RULE_ABOUT } from '@/data/ruleSort'
import { useRoadmapStore } from '@/stores/roadmap'

defineProps<{ open: boolean }>()
defineEmits<{ close: [] }>()

const roadmap = useRoadmapStore()

const ranksByGrade = computed(() => roadmap.ruleSorts.includes('grade'))
const gradeMethod = computed(() => RULE_ABOUT.grade[roadmap.stage] ?? RULE_ABOUT.noGrade)
</script>

<template>
  <ModalDialog :open="open" title="About the rule-based plan" @close="$emit('close')">
    <div class="flex flex-col gap-3">
      <p class="m-0">
        For {{ getLevel(roadmap.stage).tag }}, every school is ranked and the top three make the
        plan. You choose what the ranking goes by first.
      </p>

      <table v-if="ranksByGrade" class="w-full border-collapse text-left text-[13px]">
        <caption class="caps-label pb-1 text-left">
          Weight of each factor
        </caption>
        <thead>
          <tr class="border-b border-line">
            <th scope="col" class="py-1.5 pr-2 font-semibold">Rank by</th>
            <th scope="col" class="py-1.5 pr-2 font-semibold">Distance</th>
            <th scope="col" class="py-1.5 font-semibold">Grade</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in RULE_ABOUT.weights" :key="row.sort" class="border-b border-line-soft">
            <th scope="row" class="py-1.5 pr-2 font-semibold">{{ row.sort }}</th>
            <td class="py-1.5 pr-2">{{ row.distance }}</td>
            <td class="py-1.5">{{ row.grade }}</td>
          </tr>
        </tbody>
      </table>

      <section>
        <h4 class="m-0 text-[13px] font-bold text-ink">Distance</h4>
        <p class="m-0">{{ RULE_ABOUT.distance }}</p>
      </section>

      <section>
        <h4 class="m-0 text-[13px] font-bold text-ink">Grade</h4>
        <p class="m-0">{{ gradeMethod }}</p>
      </section>

      <section v-if="ranksByGrade">
        <h4 class="m-0 text-[13px] font-bold text-ink">Acceptable distance</h4>
        <p class="m-0">{{ RULE_ABOUT.limit }}</p>
      </section>
    </div>

    <template #actions>
      <BaseButton variant="outline" @click="$emit('close')">Close</BaseButton>
    </template>
  </ModalDialog>
</template>
