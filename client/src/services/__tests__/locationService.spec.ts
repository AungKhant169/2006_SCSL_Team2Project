import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiRequest } from '../http'
import { locatePostalCode } from '../locationService'

vi.mock('../http', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../http')>()),
  apiRequest: vi.fn(),
}))
const request = vi.mocked(apiRequest)

describe('locatePostalCode', () => {
  beforeEach(() => request.mockReset())

  it('returns where distances from the postal code are measured', async () => {
    request.mockResolvedValue({
      postal: '556000',
      district: 'Hougang',
      latitude: 1.37,
      longitude: 103.893,
    })
    await expect(locatePostalCode('556000')).resolves.toEqual({
      district: 'Hougang',
      latitude: 1.37,
      longitude: 103.893,
    })
    expect(request).toHaveBeenCalledWith('/location/556000')
  })

  it('is null for a postal code the server cannot place', async () => {
    request.mockRejectedValueOnce(new ApiError(404, 'This postal code could not be located.'))
    await expect(locatePostalCode('990000')).resolves.toBeNull()
  })

  it('passes other failures on', async () => {
    request.mockRejectedValueOnce(new ApiError(0, 'unreachable'))
    await expect(locatePostalCode('556000')).rejects.toMatchObject({ status: 0 })
  })
})
