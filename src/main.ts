import { exec } from "child_process"
import { promisify } from "util"

import * as core from "@actions/core"

async function executeBazelQuery(bazel: string, query: string): Promise<string[]> {
    const q = `${bazel} query --keep_going --universe_scope=//... --order_output=no "${query}" 2> /dev/null || true`
    const targets = (await promisify(exec)(q)).stdout
    const set = new Set<string>()
    for (const t of targets.split(/(?:\r\n|\r|\n)/g)) {
        const trimmed = t.trim()
        if (trimmed) {
            set.add(trimmed)
        }
    }
    return Array.from(set)
}

function rules(bazel: string, input: string[]): Promise<string[]> {
    return executeBazelQuery(bazel, `kind(rule, allrdeps(set(${input.join(" ")})))`)
}

async function modifiedBuildFiles(bazel: string, input: string[]): Promise<string[]> {
    const targets = await executeBazelQuery(bazel, `rbuildfiles(${input.join(", ")})`)
    return targets.map(t => {
        const pkg = t.slice(0, t.indexOf(":"))
        return `${pkg}:all`
    })
}

export async function run(): Promise<void> {
    const changedFiles: string[] = core.getInput("changed_files").split(" ")
    if (changedFiles.length === 0) {
        core.debug("no changed filed")
        core.setOutput("bazel_targets", "")
        return
    }
    const buildFiles: string[] = []
    const labels: string[] = []
    for (const f of changedFiles) {
        if (f.endsWith("BUILD") || f.endsWith("BUILD.bazel") || f.endsWith(".bzl")) {
            buildFiles.push(f)
        } else if (f === "WORKSPACE") {
            labels.push("//...")
        } else {
            labels.push(f)
        }
    }
    const bazel = core.getInput("bazel_exec", { required: false }) || "bazel"
    labels.push(...(await modifiedBuildFiles(bazel, buildFiles)))
    const processedTargets = await rules(bazel, labels)
    core.debug(`bazel targets: ${processedTargets}`)
    core.setOutput("bazel_targets", processedTargets.join(" "))
}

if (require.main === module) {
    run().catch(error => core.setFailed(error.message))
}
