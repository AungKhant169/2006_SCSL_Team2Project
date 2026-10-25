<script setup lang="ts">
import { computed, ref } from 'vue'
import { takeDatasetFiles } from '@/utils/datasetFiles'
import { formatFileSize, pluralize } from '@/utils/format'
import CsvSheetIcon from './CsvSheetIcon.vue'

const props = defineProps<{
  modelValue: File[]
  /** Set while an update runs, so the chosen files cannot change underneath it. */
  disabled?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [files: File[]] }>()

const dragging = ref(false)
/** Why the last files offered were turned away. */
const notices = ref<string[]>([])

const hasFiles = computed(() => props.modelValue.length > 0)
const totalSize = computed(() => props.modelValue.reduce((sum, file) => sum + file.size, 0))
const summary = computed(() => {
  const count = props.modelValue.length
  return `${count} ${pluralize(count, 'file')}, ${formatFileSize(totalSize.value)}`
})
const heading = computed(() => {
  if (props.disabled) return 'Files are locked while the update runs'
  if (dragging.value) return 'Release to add them'
  return hasFiles.value ? 'Drop more CSV files here' : 'Drop CSV files here'
})

function leftOut(names: string[], one: string, many: string): string[] {
  if (names.length === 0) return []
  return [names.length === 1 ? `${names[0]} ${one}` : `${names.join(', ')} ${many}`]
}

function add(incoming: File[]) {
  const { files, rejected } = takeDatasetFiles(props.modelValue, incoming)
  notices.value = [
    ...leftOut(
      rejected.notCsv,
      'is not a CSV file, so it was left out.',
      'are not CSV files, so they were left out.',
    ),
    ...leftOut(
      rejected.empty,
      'is empty, so it was left out.',
      'are empty, so they were left out.',
    ),
  ]
  const turnedAway = rejected.notCsv.length + rejected.empty.length
  if (turnedAway < incoming.length) emit('update:modelValue', files)
}

function pick(event: Event) {
  const input = event.target as HTMLInputElement
  add(Array.from(input.files ?? []))
  // The list below is the record of what was chosen. Clearing the input lets a removed file be
  // chosen again.
  input.value = ''
}

// A drop outside a handled target makes the browser open the file, so every drag is cancelled.
function over(event: DragEvent) {
  const carriesFiles = event.dataTransfer?.types.includes('Files') ?? true
  dragging.value = carriesFiles && !props.disabled
  if (event.dataTransfer) event.dataTransfer.dropEffect = dragging.value ? 'copy' : 'none'
}

function leave(event: DragEvent) {
  const into = event.relatedTarget as Node | null
  if (!(event.currentTarget as Node).contains(into)) dragging.value = false
}

function drop(event: DragEvent) {
  dragging.value = false
  if (!props.disabled) add(Array.from(event.dataTransfer?.files ?? []))
}

function remove(file: File) {
  notices.value = []
  emit(
    'update:modelValue',
    props.modelValue.filter((other) => other !== file),
  )
}

function clear() {
  notices.value = []
  emit('update:modelValue', [])
}
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <div
      class="relative"
      @dragenter.prevent="over"
      @dragover.prevent="over"
      @dragleave="leave"
      @drop.prevent="drop"
    >
      <input
        id="dataset-files"
        type="file"
        accept=".csv,text/csv"
        multiple
        :disabled="disabled"
        class="peer sr-only"
        aria-describedby="dataset-files-hint"
        @change="pick"
      />
      <label
        for="dataset-files"
        class="flex items-center rounded-xl border-[1.5px] border-dashed transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary motion-reduce:transition-none"
        :class="[
          hasFiles
            ? 'flex-row gap-3.5 px-4 py-3.5 text-left'
            : 'flex-col gap-3 px-6 py-9 text-center',
          disabled
            ? 'cursor-not-allowed border-control bg-chip opacity-70'
            : dragging
              ? 'cursor-copy border-solid border-primary bg-primary-tint'
              : 'cursor-pointer border-control bg-primary-faint hover:border-primary hover:bg-primary-tint/50',
        ]"
      >
        <CsvSheetIcon
          :active="dragging"
          class="pointer-events-none shrink-0 transition-transform motion-reduce:transition-none"
          :class="[hasFiles ? 'h-9 w-[30px]' : 'h-14 w-[47px]', dragging && '-translate-y-1']"
        />
        <span class="pointer-events-none flex flex-col gap-0.5">
          <span class="text-[15px] font-semibold">{{ heading }}</span>
          <!-- Hidden, not removed, so the zone does not shrink under the pointer mid-drag. -->
          <span v-if="!disabled" class="text-[13px] text-muted" :class="{ invisible: dragging }">
            or
            <span class="font-semibold text-primary underline underline-offset-2"
              >choose files</span
            >
            from your computer
          </span>
        </span>
      </label>
    </div>

    <p id="dataset-files-hint" class="m-0 text-xs leading-relaxed text-muted">
      Add any of the general, primary, secondary, sdp, moe, ccas and subjects files. Each is
      recognised by its columns, so file names do not matter, and any you leave out keep their last
      upload.
    </p>

    <div aria-live="polite">
      <p
        v-for="notice in notices"
        :key="notice"
        class="m-0 mb-1.5 rounded-lg bg-warn-tint px-3 py-2 text-[13px] text-warn-ink"
      >
        {{ notice }}
      </p>
    </div>

    <div v-if="hasFiles" class="panel overflow-hidden bg-white">
      <ul aria-label="Files to upload" class="m-0 flex list-none flex-col p-0">
        <li
          v-for="file in modelValue"
          :key="file.name"
          class="flex items-center gap-3 border-b border-line-soft py-2 pr-2 pl-3.5"
        >
          <CsvSheetIcon class="h-6 w-5 shrink-0" />
          <span class="min-w-0 flex-1 truncate text-sm font-semibold" :title="file.name">
            {{ file.name }}
          </span>
          <span class="text-[13px] text-muted">{{ formatFileSize(file.size) }}</span>
          <button
            type="button"
            class="grid size-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-muted transition-colors hover:bg-chip hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            :aria-label="`Remove ${file.name}`"
            :disabled="disabled"
            @click="remove(file)"
          >
            <svg
              viewBox="0 0 16 16"
              class="size-3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="M3.5 3.5l9 9M12.5 3.5l-9 9" />
            </svg>
          </button>
        </li>
      </ul>
      <div
        class="flex items-center justify-between gap-3 bg-primary-faint py-1.5 pr-2 pl-3.5 text-[13px] text-muted"
      >
        <span aria-live="polite">{{ summary }}</span>
        <button
          type="button"
          class="cursor-pointer rounded-md border-0 bg-transparent px-2.5 py-1.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary-tint disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          :disabled="disabled"
          @click="clear"
        >
          Clear all
        </button>
      </div>
    </div>
  </div>
</template>
