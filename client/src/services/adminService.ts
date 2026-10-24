import { authorizedRequest } from './authorizedRequest'

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
