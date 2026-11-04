import { describe, expect, it } from 'vitest'
import en from '../locales/en.json'
import sponsorLogos from '../src/sponsor-logos.json'

// The sponsors' logos are this website's own (inventory-app#2463): each
// entry of src/sponsor-logos.json names a file kept under theme/assets/ and a
// caption this website's texts hold.
const files = import.meta.glob('../theme/assets/**/*.{jpg,jpeg,png,gif,svg}')

describe('sponsor logos', () => {
  it('keeps a file and a caption for every logo', () => {
    expect(sponsorLogos.length).toBeGreaterThan(0)
    for (const logo of sponsorLogos) {
      expect(files[`../theme/assets/${logo.image}`], logo.image).toBeTypeOf('function')
      expect(en[logo.alt], logo.alt).toBeTruthy()
    }
  })
})
