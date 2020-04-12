import fs from "fs"
import { join } from "path"

import del from "del"

import { findAllBazelPackages, findBazelPackage } from "../src/main"

let tmp: string

async function createPackage(parent: string, name: string): Promise<string> {
    const dir = join(parent, name)
    await fs.promises.mkdir(dir)
    await fs.promises.writeFile(join(dir, "BUILD.bazel"), "")
    return dir
}

// Create a Bazel directory structure with the following format:
// root
// └── workspace
//      ├── package
//         ├── sub-package
//         ├── plainfolder
beforeAll(async () => {
    tmp = await fs.promises.mkdtemp("bazel-modified-files")
    const root = join(tmp, "root")
    await fs.promises.mkdir(root)
    const workspace = await createPackage(root, "workspace")
    const pkg = await createPackage(workspace, "package")
    await createPackage(pkg, "subpackage")
    await fs.promises.mkdir(join(pkg, "plain-folder"))
})

afterAll(async () => await del([tmp]))

describe("A multi-package project", () => {
    describe("modified file directly under the workspace", () => {
        it("should return the root as the target", async () => {
            expect(await findBazelPackage(join(tmp, "root/workspace/blah"), "workspace")).toEqual("//...")
        })

        describe("modified file under a package", () => {
            it("should return the package as the target", async () => {
                expect(await findBazelPackage(join(tmp, "root/workspace/package/blah"), "workspace")).toEqual(
                    "//package:all",
                )
            })
        })

        describe("modified file under a subpackage", () => {
            it("should return the subpackage as the target", async () => {
                expect(
                    await findBazelPackage(join(tmp, "root/workspace/package/subpackage/blah"), "workspace"),
                ).toEqual("//package/subpackage:all")
            })
        })

        describe("modified file under a package folder", () => {
            it("should return the package as the target", async () => {
                expect(
                    await findBazelPackage(join(tmp, "root/workspace/package/plain-folder/blah"), "workspace"),
                ).toEqual("//package:all")
            })
        })

        describe("non-existing package", () => {
            it("returns an empty result set", async () => {
                expect(await findBazelPackage(join(tmp, "root/blah"), "workspace")).toEqual(null)
            })
        })
    })

    describe("multiple modified files", () => {
        it("should return valid targets for all", async () => {
            expect(
                await findAllBazelPackages(
                    [
                        join(tmp, "root/workspace/blah"),
                        join(tmp, "root/workspace/package/plain-folder/blah"),
                        join(tmp, "root/blah"),
                    ],
                    "workspace",
                ),
            ).toEqual(["//...", "//package:all"])
        })
    })
})
