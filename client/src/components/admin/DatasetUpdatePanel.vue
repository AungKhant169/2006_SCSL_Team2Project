<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import StatTile from '@/components/ui/StatTile.vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()

const picker = ref<HTMLInputElement | null>(null)

const records = computed(() =>
  admin.recordCount === null ? '—' : admin.recordCount.toLocaleString('en-SG'),
)

function pick(event: Event) {
  admin.setFiles(Array.from((event.target as HTMLInputElement).files ?? []))
}

// The browser keeps showing the files it was given, so clear them once a run has used them.
watch(
  () => admin.files,
  (files) => {
    if (files.length === 0 && picker.value) picker.value.value = ''
  },
)
</script>

<template>
  <SectionCard
    title="School dataset"
    hint="Upload the raw school CSV files. They are cleaned, standardised and written in a single transaction, and rolled back entirely on any failure."
  >
    <div class="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
      <StatTile label="Last successful update" :value="admin.lastUpdate || 'Not recorded'" />
      <StatTile label="Records in database" :value="records" />
      <StatTile label="Status" :value="admin.busy ? 'Update running' : 'Idle'">
        <span :class="admin.busy ? 'text-warn-ink' : 'text-success'" data-testid="admin-status">
          {{ admin.busy ? 'Update running' : 'Idle' }}
        </span>
      </StatTile>
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="dataset-files" class="field-label">CSV files</label>
      <input
        id="dataset-files"
        ref="picker"
        type="file"
        accept=".csv,text/csv"
        multiple
        :disabled="admin.busy"
        class="text-sm"
        @change="pick"
      />
      <span class="text-xs text-muted">
        Any of the general, primary, secondary, sdp, moe, ccas and subjects files; each is
        recognised by its columns, and any left out keep their last upload.
      </span>
    </div>

    <AlertMessage v-if="admin.error">{{ admin.error }}</AlertMessage>

    <div class="flex flex-wrap items-center gap-3">
      <!-- Disabled for the whole run so a second submission cannot start (REQ-5.2). -->
      <BaseButton size="lg" :disabled="admin.busy" @click="admin.runUpdate()">
        <SpinnerIcon v-if="admin.busy" size="sm" tone="light" />
        {{ admin.busy ? 'Updating dataset…' : 'Update Dataset' }}
      </BaseButton>
      <span class="text-[13px] text-muted">
        {{
          admin.busy
            ? 'Button locked until the transaction completes or aborts.'
            : 'Completes within 10 seconds; writes commit as one transaction.'
        }}
      </span>
    </div>
  </SectionCard>
</template>
