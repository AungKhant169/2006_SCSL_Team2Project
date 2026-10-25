<script setup lang="ts">
import { computed } from 'vue'
import CsvDropZone from '@/components/admin/CsvDropZone.vue'
import AlertMessage from '@/components/ui/AlertMessage.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import StatTile from '@/components/ui/StatTile.vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()

const records = computed(() =>
  admin.recordCount === null ? '—' : admin.recordCount.toLocaleString('en-SG'),
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

    <CsvDropZone
      :model-value="admin.files"
      :disabled="admin.busy"
      @update:model-value="admin.setFiles"
    />

    <AlertMessage v-if="admin.error">{{ admin.error }}</AlertMessage>

    <div class="flex flex-wrap items-center gap-3">
      <!-- Disabled for the whole run so a second submission cannot start (REQ-5.2). -->
      <BaseButton
        size="lg"
        :disabled="admin.busy"
        data-testid="admin-update"
        @click="admin.runUpdate()"
      >
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
