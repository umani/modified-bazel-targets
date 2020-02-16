import * as core from "@actions/core"
import { dirname, join, parse } from "path"
import { exec } from "child_process"
import * as fs from "fs"
import { promisify } from "util"

async function findBuildBazelFile(currentPath: string, basePath: string): Promise<string | null> {
    try {
      await fs.promises.access(join(currentPath, "BUILD.bazel"), fs.constants.F_OK)
      return currentPath
    } catch {
      if (currentPath === basePath || basePath.indexOf(currentPath) !== -1) {
        return null
      } else {
        return (await findBuildBazelFile(dirname(currentPath), basePath))
      }
    }
}

export async function findBazelBuilds(changedFiles: string[], basePath: string = '.'): Promise<Set<string>> {
    return new Set(
        (await Promise.all(
          changedFiles.map(file => findBuildBazelFile(file, basePath))
        ))
      .filter((f): f is string => f !== null))
}

export const bazelTargets = async (input: Set<string>): Promise<string> => {
   const { stdout, stderr } = await promisify(exec)(`bazel query 'rdeps(${Array.from(input).join(', ')})'`)
   return stdout
}

export async function run(): Promise<void> {
    const changedFiles: string = core.getInput('changed-files')
    const bazelBuilds = await findBazelBuilds(changedFiles.split(" "))
    const processedTargets = await bazelTargets(bazelBuilds)
    core.debug(`bazel targets: ${processedTargets}`)
    core.setOutput('bazel-targets', processedTargets)
}

run()