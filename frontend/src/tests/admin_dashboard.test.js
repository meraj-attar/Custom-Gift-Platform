import assert from 'node:assert/strict'
import fs from 'node:fs'
import { describe, it } from 'node:test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getErrorMessage } from '../services/api.js'

describe('Admin Dashboard Architecture & Error Resilience Tests', () => {
  const currentDir = path.dirname(fileURLToPath(import.meta.url))
  const adminCandidatePaths = [
    path.resolve(currentDir, '../pages/AdminDashboard.jsx'),
    path.resolve(process.cwd(), 'frontend/src/pages/AdminDashboard.jsx'),
    path.resolve(process.cwd(), 'src/pages/AdminDashboard.jsx'),
  ]
  const adminPath = adminCandidatePaths.find((p) => fs.existsSync(p))
  const adminCode = fs.readFileSync(adminPath, 'utf8')

  it('1. Product query in loadAll requests at most 50 items to respect pagination bounds', () => {
    assert.match(adminCode, /\/products\?page_size=(?:[1-4]?[0-9]|50)\b/)
    assert.doesNotMatch(adminCode, /\/products\?page_size=100\b/)
  })

  it('2. loadAll uses Promise.allSettled for resilient multi-endpoint loading', () => {
    assert.match(adminCode, /Promise\.allSettled/)
  })

  it('3. AdminDashboard contains explicit loading and loadError state variables', () => {
    assert.match(adminCode, /const\s+\[loading,\s*setLoading\]\s*=\s*useState\(true\)/)
    assert.match(adminCode, /const\s+\[loadError,\s*setLoadError\]\s*=\s*useState\(null\)/)
  })

  it('4. Provides error state UI with Retry action instead of infinite spinner on failure', () => {
    assert.match(adminCode, /Unable to Load Admin Dashboard/)
    assert.match(adminCode, /onClick=\{loadAll\}/)
    assert.match(adminCode, /Retry/)
  })

  it('5. Toasts are deduplicated with explicit toast IDs to prevent duplicate alerts', () => {
    assert.match(adminCode, /id:\s*['"]admin-load-error['"]/)
  })

  it('6. getErrorMessage formats structured 422 validation errors cleanly', () => {
    const errorWithLoc = {
      response: {
        status: 422,
        data: {
          detail: [
            {
              loc: ['query', 'page_size'],
              msg: 'Input should be less than or equal to 50',
            },
          ],
        },
      },
    }
    const msg = getErrorMessage(errorWithLoc)
    assert.match(msg, /page_size: Input should be less than or equal to 50/)
  })
})
