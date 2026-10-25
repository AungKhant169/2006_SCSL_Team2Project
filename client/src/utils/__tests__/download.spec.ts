import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveFile } from '../download'

describe('saveFile', () => {
  const createObjectURL = vi.fn(() => 'blob:pathsg/1')
  const revokeObjectURL = vi.fn()
  let clicked: HTMLAnchorElement[]

  beforeEach(() => {
    // jsdom has neither of these, and follows no links.
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = revokeObjectURL
    clicked = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.cloneNode() as HTMLAnchorElement)
      // The link has to be in the page when it is clicked, for browsers that ignore a detached one.
      expect(document.body.contains(this)).toBe(true)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
  })

  it('clicks a link to the file that downloads under the given name', () => {
    const blob = new Blob(['a,b'], { type: 'text/csv' })
    saveFile(blob, 'pathsg_schools_20261025.csv')
    expect(createObjectURL).toHaveBeenCalledWith(blob)
    expect(clicked).toHaveLength(1)
    expect(clicked[0]!.getAttribute('href')).toBe('blob:pathsg/1')
    expect(clicked[0]!.download).toBe('pathsg_schools_20261025.csv')
  })

  it('removes the link and frees the file afterwards', () => {
    saveFile(new Blob(['a,b']), 'schools.csv')
    expect(document.querySelector('a[download]')).toBeNull()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:pathsg/1')
  })
})
