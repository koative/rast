import { describe, expect, test } from 'bun:test'
import { dedupePaths } from './export'

const blob = new Blob(['x'])
const paths = (...list: string[]) => dedupePaths(list.map((path) => ({ path, blob }))).map((e) => e.path)

describe('dedupePaths', () => {
  test('unique paths pass through', () => {
    expect(paths('a/x.png', 'a/y.png', 'b/x.png')).toEqual(['a/x.png', 'a/y.png', 'b/x.png'])
  })

  test('repeats get (2), (3) before the extension', () => {
    expect(paths('a/x.png', 'a/x.png', 'a/x.png')).toEqual(['a/x.png', 'a/x (2).png', 'a/x (3).png'])
  })

  test('collisions are case-insensitive (macOS/Windows filesystems)', () => {
    expect(paths('Photo.JPG', 'photo.jpg')).toEqual(['Photo.JPG', 'photo (2).jpg'])
  })

  test('never steals a path that exists later in the list', () => {
    expect(paths('x.png', 'x.png', 'x (2).png')).toEqual(['x.png', 'x (3).png', 'x (2).png'])
  })

  test('no extension, and dots in folder names are not treated as extensions', () => {
    expect(paths('v1.2/readme', 'v1.2/readme')).toEqual(['v1.2/readme', 'v1.2/readme (2)'])
  })

  test('a file never takes the name of a folder, whichever comes first', () => {
    expect(paths('photo.avif', 'photo.avif/second.avif')).toEqual(['photo (2).avif', 'photo.avif/second.avif'])
    expect(paths('photo.avif/second.avif', 'photo.avif')).toEqual(['photo.avif/second.avif', 'photo (2).avif'])
    expect(paths('photo.avif', 'Photo.avif/second.avif')).toEqual(['photo (2).avif', 'Photo.avif/second.avif'])
    expect(paths('a/b', 'a/b/c/d.png')).toEqual(['a/b (2)', 'a/b/c/d.png'])
  })

  test('a renamed file does not land on a folder either', () => {
    expect(paths('x.avif', 'x.avif/a.avif', 'x (2).avif/b.avif')).toEqual(['x (3).avif', 'x.avif/a.avif', 'x (2).avif/b.avif'])
  })

  test('keeps the blob and other fields', () => {
    const date = new Date(0)
    const [, second] = dedupePaths([
      { path: 'a.png', blob },
      { path: 'a.png', blob, lastModified: date },
    ])
    expect(second).toEqual({ path: 'a (2).png', blob, lastModified: date })
  })
})
