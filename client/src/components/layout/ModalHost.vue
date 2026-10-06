<script setup lang="ts">
import BaseButton from '@/components/ui/BaseButton.vue'
import ModalDialog from '@/components/ui/ModalDialog.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
</script>

<template>
  <ModalDialog
    :open="ui.modalDefinition !== null"
    :title="ui.modalDefinition?.title ?? ''"
    @close="ui.closeModal()"
  >
    {{ ui.modalDefinition?.body }}
    <template #actions>
      <BaseButton variant="outline" @click="ui.closeModal()">
        {{ ui.modalDefinition?.cancel }}
      </BaseButton>
      <BaseButton
        v-if="ui.modalDefinition?.confirm"
        :variant="ui.modalDefinition.tone === 'danger' ? 'danger' : 'primary'"
        @click="ui.confirmModal()"
      >
        {{ ui.modalDefinition.confirm }}
      </BaseButton>
    </template>
  </ModalDialog>
</template>
