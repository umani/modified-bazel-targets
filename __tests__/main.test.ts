import * as process from "process"
import * as fs from "fs"
import * as tmp from "tmp-promise"
import { findBazelBuilds, run } from "../src/main"
import { join, dirname } from "path"

describe('In a One-file project', () => {
    let dir: tmp.DirectoryResult

    beforeAll(async () => dir = await tmp.dir())
    afterAll(async() => dir.cleanup())

    describe("if BUILD.bazel file", () => {
        describe("does exist", () => {
          let f: tmp.FileResult

          beforeAll(async () => f = await tmp.file({ name: 'BUILD.bazel', dir: dir.path }))
          afterAll(async() => f.cleanup())

          test('its there', () => { expect(fs.promises.access(f.path, fs.constants.F_OK)).resolves })
          test('its path is ok', () => { expect(join(dir.path, "BUILD.bazel")).toBe(f.path) })
          test('its parent directory is found as target', async () => { expect(await findBazelBuilds([f.path], dir.path)).toContain(dirname(f.path)) })
        })

        describe("does not exist", () => {
          let f: string

          beforeAll(() => f = join(dir.path, "BUILD.bazel"))
          test('its not there', async () => { await expect(fs.promises.access(f, fs.constants.F_OK)).rejects.toThrowError() })
          test('its parent directory is not a target', async () => { expect(await findBazelBuilds([f], dir.path)).toEqual(new Set<string>()) })

        })
    })
})

describe('In a Multi-file project', () => {
    let dirs: Set<tmp.DirectoryResult>
    let basename: string

    beforeAll(async () => {
      dirs = new Set<tmp.DirectoryResult>()
      for(let i = 0; i < 5; i++) {
        let dir = await tmp.dir()
        dirs.add(dir)
        basename = dir.path
      }
    })

    afterAll(async () => { for(const dir of dirs) { await dir.cleanup() } })

    describe("if BUILD.bazel file", () => {
        describe("does not exist", () => {
          let files: string[]
          beforeAll(() => files = Array.from(dirs, (dir) => { return join(dir.path, 'BUILD.bazel') }))

          test('its parent directory is not found as target', async () => {
            expect(await findBazelBuilds(files, basename)).toEqual(new Set<string>())
          })
        })

        describe("does exist in all dirs", () => {
          let files: Map<string, tmp.FileResult>

          beforeAll(async () => {
            files = new Map<string, tmp.FileResult>()
            for (const dir of dirs) { files.set(dir.path, await tmp.file({ name: 'BUILD.bazel', dir: dir.path })) }
          })

          afterAll(async () => { for (const [_, file] of files) { await file.cleanup() }})

          test('all parent directory are found as target', async () => {
            expect(await findBazelBuilds([...files.keys()], basename)).toEqual(new Set<string>([...files.keys()]))
          })
        })

        describe("does exist in some dirs", () => {
          let files: Map<string, tmp.FileResult>

          beforeAll(async () => {
            files = new Map<string, tmp.FileResult>()
            const it = dirs.values()
            const dir1 = it.next().value
            const dir2 = it.next().value
            files.set(dir1.path, await tmp.file({ name: 'BUILD.bazel', dir: dir1.path }))
            files.set(dir2.path, await tmp.file({ name: 'BUILD.bazel', dir: dir2.path }))
          })

          afterAll(async () => { for (const [_, file] of files) { await file.cleanup() }})

          test('some parent directories are found as target', async () => {
            expect(await findBazelBuilds([...files.keys()], basename)).toEqual(new Set<string>([...files.keys()]))
          })
        })
    })
})
