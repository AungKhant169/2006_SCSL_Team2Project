import { describe, expect, it } from 'vitest'
import { formatSchoolName, schoolAcronym } from '../schoolName'

describe('formatSchoolName', () => {
  it.each([
    ['NANYANG PRIMARY SCHOOL', 'Nanyang Primary School'],
    ["ST. GABRIEL'S SECONDARY SCHOOL", "St. Gabriel's Secondary School"],
    ["CEDAR GIRLS' SECONDARY SCHOOL", "Cedar Girls' Secondary School"],
    ['ANGLO-CHINESE SCHOOL (PRIMARY)', 'Anglo-Chinese School (Primary)'],
    ['CHIJ (KATONG) PRIMARY', 'CHIJ (Katong) Primary'],
    ['CHIJ OUR LADY OF THE NATIVITY', 'CHIJ Our Lady of the Nativity'],
    ['SCHOOL OF THE ARTS, SINGAPORE', 'School of the Arts, Singapore'],
    [
      'ELECTIVE PROGRAMME IN MALAY FOR SECONDARY (EMAS)',
      'Elective Programme in Malay for Secondary (Emas)',
    ],
    ['BUKIT PANJANG GOVT. HIGH SCHOOL', 'Bukit Panjang Govt. High School'],
  ])('%s becomes %s', (raw, expected) => {
    expect(formatSchoolName(raw)).toBe(expected)
  })

  it('leaves a name that is already in title case alone', () => {
    expect(formatSchoolName('Rosyth School')).toBe('Rosyth School')
  })

  it('trims the name', () => {
    expect(formatSchoolName('  ROSYTH SCHOOL ')).toBe('Rosyth School')
  })
})

describe('schoolAcronym', () => {
  it.each([
    ['Nanyang Primary School', 'NP'],
    ['Raffles Institution', 'RI'],
    ['Temasek Junior College', 'TJC'],
    ['CHIJ Our Lady of the Nativity', 'COLN'],
    ['Anglo-Chinese School (Primary)', 'AC'],
  ])('%s is %s', (name, expected) => {
    expect(schoolAcronym(name)).toBe(expected)
  })

  it('uses at most four initials', () => {
    expect(schoolAcronym('Saint Andrew Of The Very Long Name College')).toHaveLength(4)
  })
})
