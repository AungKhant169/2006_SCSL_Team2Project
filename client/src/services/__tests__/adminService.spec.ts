import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchDatasetStatus, updateDataset } from '../adminService'
import { authorizedRequest } from '../authorizedRequest'

vi.mock('../authorizedRequest', () => ({ authorizedRequest: vi.fn() }))
const request = vi.mocked(authorizedRequest)

describe('adminService (matches the /admin API contract)', () => {
  beforeEach(() => request.mockReset())

  it('reads the dataset status', async () => {
    request.mockResolvedValue({ records: 337, last_update: '2026-10-20T06:30:00+00:00' })
    await expect(fetchDatasetStatus()).resolves.toEqual({
      records: 337,
      lastUpdate: '2026-10-20T06:30:00+00:00',
    })
    expect(request).toHaveBeenCalledWith('/admin/dataset')
  })

  it('uploads every chosen file in one multipart request', async () => {
    request.mockResolvedValue({ message: 'ok', schools: 337, added: 0, updated: 337 })
    const files = [
      new File(['a'], 'moe.csv', { type: 'text/csv' }),
      new File(['b'], 'ccas.csv', { type: 'text/csv' }),
    ]
    await updateDataset(files)
    const [path, options] = request.mock.calls[0]!
    expect(path).toBe('/admin/dataset/update')
    expect(options?.method).toBe('POST')
    const form = options?.body as FormData
    expect(form.getAll('files').map((f) => (f as File).name)).toEqual(['moe.csv', 'ccas.csv'])
  })
})
