<script setup lang="ts">
import { computed, ref } from 'vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SegmentedControl from '@/components/ui/SegmentedControl.vue'
import { CITIZENSHIPS, getTier } from '@/data/education'
import type { CitizenshipId, School } from '@/types/school'
import { formatMoney } from '@/utils/format'

const props = defineProps<{ school: School }>()

/** Fees are always itemised by citizenship tier (REQ-1.10, BR-1). */
const citizenship = ref<CitizenshipId>('sc')

const tier = computed(() => getTier(props.school.tier))
const options = CITIZENSHIPS.map((c) => ({ value: c.id, label: c.shortLabel }))
const citizenshipLabel = computed(() => CITIZENSHIPS.find((c) => c.id === citizenship.value)!.label)
</script>

<template>
  <SectionCard :title="`${tier.courseHeading} & fees`" title-size="lg">
    <template #actions>
      <SegmentedControl v-model="citizenship" :options="options" label="Citizenship" />
    </template>

    <p class="m-0 text-[13px] text-muted">
      Fees shown for <b>{{ citizenshipLabel }}</b
      >{{ tier.feeUnit }}. Itemised per course; figures are illustrative.
    </p>

    <div class="overflow-hidden rounded-[10px] border border-line-soft">
      <table class="w-full border-collapse text-left text-sm">
        <thead class="bg-surface text-xs tracking-wide text-muted uppercase">
          <tr>
            <th scope="col" class="w-[42%] px-3.5 py-2.5 font-semibold">{{ tier.courseColumn }}</th>
            <th scope="col" class="px-3.5 py-2.5 font-semibold">Field</th>
            <th scope="col" class="px-3.5 py-2.5 text-right font-semibold">Tuition</th>
            <th scope="col" class="px-3.5 py-2.5 text-right font-semibold">Misc. fees</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="school.courses.length === 0" class="border-t border-line-soft">
            <td colspan="4" class="px-3.5 py-3 text-muted">Not available</td>
          </tr>
          <tr v-for="course in school.courses" :key="course.name" class="border-t border-line-soft">
            <th scope="row" class="px-3.5 py-3 font-medium">{{ course.name }}</th>
            <td class="px-3.5 py-3 text-[13px] text-muted">{{ course.field }}</td>
            <td class="px-3.5 py-3 text-right font-semibold">
              {{ formatMoney(course.fees[citizenship]) }}
            </td>
            <td class="px-3.5 py-3 text-right text-soft">{{ formatMoney(course.miscFee) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </SectionCard>
</template>
