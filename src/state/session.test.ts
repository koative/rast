import { describe, expect, mock, test } from 'bun:test'
import { variantKey, type VariantSpec } from '../engine/formats'
import type { SavedImage, SavedSession } from './persist'
import type { ImageEntry, Variant } from './types'

// The session talks to IndexedDB and to codec workers. Both are replaced here, and bun's mock.module applies
// to the whole test process: no other test file may rely on the real persist or pool modules.
const saved = Promise.withResolvers<SavedSession | null>()
const savedImages: Array<{ id: string; name: string }> = []
mock.module('./persist', () => ({
  loadSaved: () => saved.promise,
  saveImage: async (image: SavedImage) => {
    savedImages.push({ id: image.id, name: image.name })
  },
  saveMeta: async () => {},
  saveVariant: async () => {},
  deleteImage: async () => {},
  deleteVariants: async () => {},
  clearSaved: async () => {},
}))
// Probes and encodes never finish: these tests are about what the session does before results arrive.
mock.module('../engine/pool', () => ({
  CodecPool: class {
    probe = () => new Promise(() => {})
    encode = () => new Promise(() => {})
  },
}))
// Loaded after the mocks: session creates its codec pool when the module first evaluates.
const { addFiles, applyToAll, restoreSession, useSession } = await import('./session')

function variant(spec: VariantSpec): Variant {
  return { key: variantKey(spec), spec, tier: 'balanced', status: 'done', bytes: 1_000, ms: 1, blob: null, viewUrl: null, patchUrl: null, error: null }
}

function entry(id: string, opts: Partial<ImageEntry> = {}): ImageEntry {
  const results = [variant({ format: 'jpeg', quality: 75 }), variant({ format: 'webp', quality: 75 })]
  return {
    id,
    name: `${id}.png`,
    relativePath: `${id}.png`,
    folder: '',
    file: new File([], `${id}.png`),
    bytes: 100_000,
    sourceType: 'png',
    status: 'ready',
    width: 10,
    height: 10,
    hasAlpha: false,
    originalUrl: null,
    thumbUrl: null,
    patch: null,
    error: null,
    variants: Object.fromEntries(results.map((v) => [v.key, v])),
    pinned: null,
    ...opts,
  }
}

describe('restoring the saved session', () => {
  test('an image added while it loads joins it, without taking a saved image’s id', async () => {
    const restoring = restoreSession()
    const adding = addFiles({
      files: [{ file: new File(['new'], 'new.png', { type: 'image/png' }), relativePath: 'new.png', sourceType: 'png' }],
      skipped: [],
    })
    saved.resolve({
      meta: { order: ['img1'], selectedId: 'img1', view: 'stage', pinned: {} },
      images: [
        { id: 'img1', name: 'old.png', relativePath: 'old.png', folder: '', file: new File(['old'], 'old.png'), sourceType: 'png', status: 'error', error: 'unreadable', probe: null },
      ],
      variants: [],
    })
    await Promise.all([restoring, adding])

    const { images, order } = useSession.getState()
    expect(order.map((id) => images[id].name)).toEqual(['old.png', 'new.png'])
    expect(savedImages).not.toContainEqual({ id: 'img1', name: 'new.png' })
  })
})

describe('applyToAll', () => {
  test('a format without transparency skips images whose transparency is not known yet', () => {
    useSession.setState({ images: { a: entry('a'), b: entry('b', { status: 'probing' }) }, order: ['a', 'b'] })
    applyToAll('jpeg', 75)
    const { images } = useSession.getState()
    expect(images.a.pinned).toBe('jpeg@75')
    expect(images.b.pinned).toBeNull()
  })

  test('a format that keeps transparency still applies to them', () => {
    useSession.setState({ images: { a: entry('a'), b: entry('b', { status: 'probing' }) }, order: ['a', 'b'] })
    applyToAll('webp', 75)
    const { images } = useSession.getState()
    expect(images.b.pinned).toBe('webp@75')
  })
})
