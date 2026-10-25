import { describe, expect, it } from 'vitest'
import { isCsv, takeDatasetFiles } from '../datasetFiles'

const file = (name: string, content = 'a,b') => new File([content], name)

describe('isCsv', () => {
  it('goes by the extension, whatever its case or reported type', () => {
    expect(isCsv(file('moe.csv'))).toBe(true)
    expect(isCsv(file('MOE.CSV'))).toBe(true)
    expect(isCsv(new File(['a'], 'moe.csv', { type: 'application/vnd.ms-excel' }))).toBe(true)
    expect(isCsv(file('moe.csv.txt'))).toBe(false)
    expect(isCsv(file('csv'))).toBe(false)
  })
})

describe('takeDatasetFiles', () => {
  it('adds new files after the ones already chosen', () => {
    const moe = file('moe.csv')
    const ccas = file('ccas.csv')
    expect(takeDatasetFiles([moe], [ccas]).files).toEqual([moe, ccas])
  })

  it('separates files that are not CSVs from files that are empty', () => {
    const { files, rejected } = takeDatasetFiles(
      [],
      [file('notes.txt'), file('blank.csv', ''), file('moe.csv')],
    )
    expect(files.map((f) => f.name)).toEqual(['moe.csv'])
    expect(rejected).toEqual({ notCsv: ['notes.txt'], empty: ['blank.csv'] })
  })

  it('lets a file with a name already chosen take its place', () => {
    const older = file('moe.csv', 'old')
    const ccas = file('ccas.csv')
    const newer = file('moe.csv', 'newer')
    expect(takeDatasetFiles([older, ccas], [newer]).files).toEqual([newer, ccas])
  })

  it('keeps an empty file from replacing a good one of the same name', () => {
    const moe = file('moe.csv')
    expect(takeDatasetFiles([moe], [file('moe.csv', '')]).files).toEqual([moe])
  })
})
