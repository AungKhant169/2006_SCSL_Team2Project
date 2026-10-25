import { authorizedDownload, authorizedRequest } from './authorizedRequest'

/** Rows added and changed by one run of the school data update. */
export interface UpdateSummary {
  message: string
  schools: number
  added: number
  updated: number
}

export interface DatasetStatus {
  records: number
  /** ISO timestamp of the last load, or null if the data was never loaded through the update. */
  lastUpdate: string | null
}

/** The school database as a CSV file, with the name to save it under. */
export interface DatasetExport {
  blob: Blob
  filename: string
}

interface StatusPayload {
  records: number
  last_update: string | null
}

export async function fetchDatasetStatus(): Promise<DatasetStatus> {
  const status = await authorizedRequest<StatusPayload>('/admin/dataset')
  return { records: status.records, lastUpdate: status.last_update }
}

/**
 * Sends the raw school CSV files. The server cleans them and writes everything in one
 * transaction, or changes nothing (REQ-5.5).
 */
export function updateDataset(files: File[]): Promise<UpdateSummary> {
  const form = new FormData()
  for (const file of files) form.append('files', file)
  return authorizedRequest<UpdateSummary>('/admin/dataset/update', { method: 'POST', body: form })
}

/** The name the server gives the file is pathsg_schools_YYYYMMDD.csv; this is for a response without it. */
const EXPORT_FILENAME = 'pathsg_schools.csv'

/** Every school with all its details, and nothing about accounts, roadmaps or reviews (REQ-5.12, REQ-5.13). */
export async function exportDataset(): Promise<DatasetExport> {
  const { blob, filename } = await authorizedDownload('/admin/dataset/export')
  return { blob, filename: filename ?? EXPORT_FILENAME }
}
