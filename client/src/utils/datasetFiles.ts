/** Files that could not join the upload, by why. */
export interface RejectedFiles {
  notCsv: string[]
  empty: string[]
}

export interface IntakeResult {
  files: File[]
  rejected: RejectedFiles
}

/** The server checks the extension, not the type: Windows reports CSVs as Excel files. */
export function isCsv(file: File): boolean {
  return file.name.toLowerCase().endsWith('.csv')
}

/**
 * Adds `incoming` to the files already chosen. Dropped files skip the picker's CSV filter and the
 * server refuses an empty or non-CSV file, so those are turned away here. The server keys uploads
 * by file name, so a file with a name already chosen replaces it rather than being sent twice.
 */
export function takeDatasetFiles(current: File[], incoming: File[]): IntakeResult {
  const rejected: RejectedFiles = { notCsv: [], empty: [] }
  const byName = new Map(current.map((file) => [file.name, file]))
  for (const file of incoming) {
    if (!isCsv(file)) rejected.notCsv.push(file.name)
    else if (file.size === 0) rejected.empty.push(file.name)
    else byName.set(file.name, file)
  }
  return { files: [...byName.values()], rejected }
}
