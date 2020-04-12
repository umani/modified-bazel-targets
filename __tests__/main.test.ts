import fs from "fs"
import { join } from "path"

import del from "del"

import { findAllBazelPackages, findBazelPackage } from "../src/main"

let tmp: string

async function createPackage(parent: string, name: string): Promise<string> {
    const dir = join(parent, name)
    await fs.promises.mkdir(dir)
    await fs.promises.writeFile(join(dir, name === "workspace" ? "WORKSPACE" : "BUILD.bazel"), "")
    return dir
}

// Create a Bazel directory structure with the following format:
// workspace
//  ├── package
//     ├── sub-package
//     ├── plainfolder
beforeAll(async () => {
    tmp = await fs.promises.mkdtemp("bazel-modified-files")
    const workspace = await createPackage(tmp, "workspace")
    const pkg = await createPackage(workspace, "package")
    await createPackage(pkg, "subpackage")
    await fs.promises.mkdir(join(pkg, "plain-folder"))
    process.chdir(workspace)
})

afterAll(async () => {
    process.chdir("../..")
    await del([tmp])
})

describe("A multi-package project", () => {
    describe("modified file directly under the workspace", () => {
        it("should return the root as the target", async () => {
            expect(await findBazelPackage("./blah.go")).toEqual("//...")
            expect(await findBazelPackage("blah.go")).toEqual("//...")
        })

        describe("modified file under a package", () => {
            it("should return the package as the target", async () => {
                expect(await findBazelPackage("package/blah.go")).toEqual("//package:all")
            })
        })

        describe("modified file under a subpackage", () => {
            it("should return the subpackage as the target", async () => {
                expect(await findBazelPackage("package/subpackage/blah.go")).toEqual("//package/subpackage:all")
            })
        })

        describe("modified file under a package folder", () => {
            it("should return the package as the target", async () => {
                expect(await findBazelPackage("package/plain-folder/blah.go")).toEqual("//package:all")
                expect(await findBazelPackage("blah/blah.go")).toEqual("//...")
            })
        })
    })

    describe("multiple modified files", () => {
        it("should return valid targets for all", async () => {
            expect(await findAllBazelPackages(["./blah.go", "package/plain-folder/blah.go", "blah/blah.go"])).toEqual([
                "//...",
                "//package:all",
            ])
        })
    })
})
