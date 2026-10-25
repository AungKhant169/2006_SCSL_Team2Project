import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import CsvDropZone from '../CsvDropZone.vue'

const csv = (name: string, content = 'a,b') => new File([content], name, { type: 'text/csv' })

function mountZone(files: File[] = [], disabled = false) {
  return mount(CsvDropZone, { props: { modelValue: files, disabled } })
}

/** Drops files on the zone the way a browser would. */
function drop(w: VueWrapper, ...files: File[]) {
  return w.get('label').element.parentElement!.dispatchEvent(dropEvent(files))
}

function dropEvent(files: File[]) {
  const event = new Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'dataTransfer', { value: { files, types: ['Files'] } })
  return event
}

const emitted = (w: VueWrapper) => w.emitted<[File[]]>('update:modelValue')?.map(([files]) => files)

describe('CsvDropZone', () => {
  describe('empty', () => {
    it('invites files to be dropped or chosen, and says what is accepted', () => {
      const w = mountZone()
      expect(w.get('label').text()).toContain('Drop CSV files here')
      expect(w.get('label').text()).toContain('choose files')
      expect(w.get('#dataset-files-hint').text()).toContain('recognised by its columns')
      expect(w.find('ul').exists()).toBe(false)
    })

    it('labels the file input with the zone', () => {
      const w = mountZone()
      expect(w.get('label').attributes('for')).toBe('dataset-files')
      expect(w.get('input').attributes('aria-describedby')).toBe('dataset-files-hint')
    })
  })

  describe('with files', () => {
    it('lists each file with its size, and the total', () => {
      const w = mountZone([csv('moe.csv', 'x'.repeat(2048)), csv('ccas.csv', 'x'.repeat(512))])
      const rows = w.findAll('li').map((row) => row.text())
      expect(rows[0]).toContain('moe.csv')
      expect(rows[0]).toContain('2 KB')
      expect(rows[1]).toContain('ccas.csv')
      expect(rows[1]).toContain('512 B')
      expect(w.text()).toContain('2 files, 3 KB')
      expect(w.get('label').text()).toContain('Drop more CSV files here')
    })

    it('removes one file, leaving the others', async () => {
      const moe = csv('moe.csv')
      const ccas = csv('ccas.csv')
      const w = mountZone([moe, ccas])
      await w.get('[aria-label="Remove moe.csv"]').trigger('click')
      expect(emitted(w)).toEqual([[ccas]])
    })

    it('clears them all', async () => {
      const w = mountZone([csv('moe.csv'), csv('ccas.csv')])
      await w
        .findAll('button')
        .find((b) => b.text() === 'Clear all')!
        .trigger('click')
      expect(emitted(w)).toEqual([[]])
    })
  })

  describe('adding files', () => {
    it('keeps the files already chosen when more are dropped', async () => {
      const moe = csv('moe.csv')
      const ccas = csv('ccas.csv')
      const w = mountZone([moe])
      drop(w, ccas)
      await w.vm.$nextTick()
      expect(emitted(w)).toEqual([[moe, ccas]])
    })

    it('turns away a file that is not a CSV, and says so', async () => {
      const w = mountZone()
      drop(w, csv('notes.txt'))
      await w.vm.$nextTick()
      expect(emitted(w)).toBeUndefined()
      expect(w.get('[aria-live="polite"]').text()).toBe(
        'notes.txt is not a CSV file, so it was left out.',
      )
    })

    it('turns away an empty file, and keeps the rest of the drop', async () => {
      const moe = csv('moe.csv')
      const w = mountZone()
      drop(w, moe, csv('blank.csv', ''))
      await w.vm.$nextTick()
      expect(emitted(w)).toEqual([[moe]])
      expect(w.get('[aria-live="polite"]').text()).toBe('blank.csv is empty, so it was left out.')
    })

    it('names every file it turned away', async () => {
      const w = mountZone()
      drop(w, csv('a.txt'), csv('b.xlsx'))
      await w.vm.$nextTick()
      expect(w.get('[aria-live="polite"]').text()).toBe(
        'a.txt, b.xlsx are not CSV files, so they were left out.',
      )
    })

    it('swaps a file for a new one of the same name instead of sending both', async () => {
      const older = csv('moe.csv', 'old')
      const newer = csv('moe.csv', 'new')
      const w = mountZone([older])
      drop(w, newer)
      await w.vm.$nextTick()
      expect(emitted(w)).toEqual([[newer]])
    })

    it('shows the drop target while files are dragged over it, and stops when they leave', async () => {
      const w = mountZone()
      const target = w.get('label').element.parentElement!
      const over = new Event('dragover', { bubbles: true, cancelable: true })
      Object.defineProperty(over, 'dataTransfer', { value: { types: ['Files'] } })
      target.dispatchEvent(over)
      await w.vm.$nextTick()
      expect(w.get('label').text()).toContain('Release to add them')
      target.dispatchEvent(new Event('dragleave', { bubbles: true }))
      await w.vm.$nextTick()
      expect(w.get('label').text()).toContain('Drop CSV files here')
    })
  })

  describe('while an update runs', () => {
    it('locks the input and the buttons, and ignores a drop', async () => {
      const w = mountZone([csv('moe.csv')], true)
      expect(w.get('input').attributes('disabled')).toBeDefined()
      expect(w.get('[aria-label="Remove moe.csv"]').attributes('disabled')).toBeDefined()
      expect(w.findAll('button').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
      expect(w.get('label').text()).toContain('locked while the update runs')
      drop(w, csv('ccas.csv'))
      await w.vm.$nextTick()
      expect(emitted(w)).toBeUndefined()
    })
  })
})
