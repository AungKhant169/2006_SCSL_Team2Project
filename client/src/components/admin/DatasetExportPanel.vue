<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import SectionCard from '@/components/ui/SectionCard.vue'
import SpinnerIcon from '@/components/ui/SpinnerIcon.vue'
import { useAdminStore } from '@/stores/admin'

const admin = useAdminStore()
</script>

<template>
  <SectionCard
    title="Export school dataset"
    hint="Download every school record in the database, with all its details, as one CSV file. User accounts, saved roadmaps and reviews are never included."
  >
    <div class="flex flex-wrap items-center gap-3">
      <!-- Disabled while the file is being fetched so a second click cannot start another download. -->
      <BaseButton
        variant="outline-primary"
        size="lg"
        class="disabled:opacity-60"
        :disabled="admin.exporting"
        data-testid="admin-export"
        @click="admin.runExport()"
      >
        <SpinnerIcon v-if="admin.exporting" size="sm" />
        {{ admin.exporting ? 'Exporting…' : 'Export Database' }}
      </BaseButton>
      <span class="text-[13px] text-muted">
        Saved as pathsg_schools_YYYYMMDD.csv, dated the day of the export.
      </span>
    </div>
  </SectionCard>
</template>
