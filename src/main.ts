import { exec } from "child_process"
import fs from "fs"
import { dirname, join } from "path"
import { promisify } from "util"

import * as core from "@actions/core"

async function fileExists(path: string): Promise<boolean> {
    try {
        await fs.promises.access(path, fs.constants.F_OK)
        return true
    } catch {
        return false
    }
}

export async function findBazelPackage(path: string): Promise<string> {
    if (await fileExists(join(path, "WORKSPACE"))) {
        return "//..."
    }
    if (await fileExists(join(path, "BUILD.bazel"))) {
        return `//${path}:all`
    }
    const parent = dirname(path)
    if (parent === path) {
        throw new Error("This action should be run only for files inside a Bazel workspace")
    }
    return await findBazelPackage(parent)
}

export async function findAllBazelPackages(changedFiles: string[]): Promise<string[]> {
    const targets = await Promise.all(Array.from(new Set(changedFiles.map(dirname))).map(f => findBazelPackage(f)))
    return Array.from(new Set(targets))
}

async function bazelTargets(bazel: string, input: string[], query: (t: string) => string): Promise<string[]> {
    const targets = await promisify(exec)(`${bazel} query '${query(`set(${input.join(" ")})`)}'`)
    const set = new Set<string>()
    targets.stdout.split(/(?:\r\n|\r|\n)/g).forEach(l => l.trim() && set.add(l))
    return Array.from(set)
}

export async function run(): Promise<void> {
    const changedFiles: string = core.getInput("changed-files")
    if (changedFiles.trim() === "") {
        core.debug("no changed filed")
        core.setOutput("bazel_targets", "")
        return
    }
    const bazel: string = core.getInput("bazel-exec", { required: false }) || "bazel"
    const bazelBuilds = await findAllBazelPackages(changedFiles.split(" "))
    const processedTargets = await bazelTargets(bazel, bazelBuilds, t => `rdeps(//..., ${t})`)
    core.debug(`bazel targets: ${processedTargets}`)
    core.setOutput("bazel_targets", processedTargets.join(" "))
}

if (require.main === module) {
    run().catch(error => core.setFailed(error.message))
}
