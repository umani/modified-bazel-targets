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

const normalize = (path: string): string => path.replace(/^\/+|\/+$/g, "")

export async function findBazelPackage(path: string, workspace: string): Promise<string | null> {
    if (path.match(`\/?${workspace}\/?$`)) {
        return "//..."
    }
    if (await fileExists(join(path, "BUILD.bazel"))) {
        return `//${normalize(path.substring(path.indexOf(workspace) + workspace.length, path.length))}:all`
    }
    const parent = dirname(path)
    if (parent === path) {
        return null
    }
    return await findBazelPackage(parent, workspace)
}

export async function findAllBazelPackages(changedFiles: string[], workspace: string): Promise<string[]> {
    const packages = await Promise.all(
        Array.from(new Set(changedFiles.map(dirname))).map(f => findBazelPackage(f, workspace)),
    )
    return Array.from(new Set(packages.filter((f): f is string => f !== null)))
}

async function bazelTargets(bazel: string, input: string[]): Promise<string[]> {
    const targets = await Promise.all(input.map(p => `${bazel} query 'rdeps(//..., ${p})'`).map(promisify(exec)))
    return Array.from(
        targets.reduce<Set<string>>((s, { stdout }) => {
            stdout
                .toString()
                .split(/(?:\r\n|\r|\n)/g)
                .forEach(l => s.add(l))
            return s
        }, new Set()),
    )
}

export async function run(): Promise<void> {
    const changedFiles: string = core.getInput("changed-files")
    const workspace: string = core.getInput("workspace-folder")
    const bazel: string = core.getInput("bazel-exec", { required: false }) || "bazel"
    const bazelBuilds = await findAllBazelPackages(changedFiles.split(" "), normalize(workspace))
    const processedTargets = (await bazelTargets(bazel, bazelBuilds)).join(" ")
    core.debug(`bazel targets: ${processedTargets}`)
    core.setOutput("bazel-targets", processedTargets)
}

if (require.main === module) {
    run()
}
