<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    hint?: string
    /** `lg` is used on the school profile, `md` everywhere else. */
    titleSize?: 'md' | 'lg'
  }>(),
  { titleSize: 'md' },
)
</script>

<template>
  <section class="card card-padded">
    <header
      v-if="title || $slots.title || $slots.actions"
      class="flex flex-wrap items-center justify-between gap-3"
    >
      <div>
        <h2 :class="titleSize === 'lg' ? 'section-title-lg' : 'section-title'">
          <slot name="title">{{ title }}</slot>
        </h2>
        <p v-if="hint" class="section-hint">{{ hint }}</p>
      </div>
      <slot name="actions" />
    </header>
    <slot />
  </section>
</template>
