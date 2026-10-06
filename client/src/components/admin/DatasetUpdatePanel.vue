<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import StatTile from '@/components/ui/StatTile.vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()
</script>

<template>
  <SectionCard
    title="School dataset"
    hint="Fetches from external endpoints (data.gov.sg, OneMap), standardises records, and bulk-writes them in a single transaction. Rolled back entirely on any failure."
  >
    <div class="grid grid-cols-[repeat(auto-fit,minmax(min(160px,100%),1fr))] gap-3">
      <StatTile label="Last successful update" :value="admin.lastUpdate" />
      <StatTile label="Records in database" :value="admin.recordCount.toLocaleString('en-SG')" />
      <StatTile label="Status" :value="admin.busy ? 'Update running' : 'Idle'">
        <span :class="admin.busy ? 'text-warn-ink' : 'text-success'" data-testid="admin-status">
          {{ admin.busy ? 'Update running' : 'Idle' }}
        </span>
      </StatTile>
    </div>

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
