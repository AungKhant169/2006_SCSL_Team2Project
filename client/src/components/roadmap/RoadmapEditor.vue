<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSelect from '@/components/ui/BaseSelect.vue'
import FormField from '@/components/ui/FormField.vue'
import { useRoadmapStore } from '@/stores/roadmap'
import { choiceLabel } from '@/utils/format'

defineEmits<{ save: []; cancel: [] }>()

const roadmap = useRoadmapStore()

/** Choices can only be swapped for institutions of the saved stage (REQ-3.14). */
const options = () =>
  roadmap.savedPool.map((school) => ({ value: String(school.id), label: school.name }))
</script>

<template>
  <form class="flex flex-col gap-3" @submit.prevent="$emit('save')">
    <FormField
      v-for="(schoolId, index) in roadmap.editChoices"
      :key="index"
      v-slot="{ id }"
      :label="choiceLabel(index)"
      caps
    >
      <BaseSelect
        :id="id"
        :model-value="String(schoolId)"
        :options="options()"
        @update:model-value="roadmap.setChoice(index, Number($event))"
      />
    </FormField>
    <div class="flex flex-wrap gap-2">
      <BaseButton type="submit">Save Changes</BaseButton>
      <BaseButton variant="outline" @click="$emit('cancel')">Cancel</BaseButton>
    </div>
  </form>
</template>
