# Modified Bazel Targets Action

[![Build](https://github.com/umani/modified-bazel-targets/workflows/build-test/badge.svg)](https://github.com/umani/modified-bazel-targets/actions?query=workflow%3A%22build-test%22)


This GitHub action applies to pull requests and populates an output variable with the set of Bazel targets that have changed (including dependencies), based on the set of files that have been changed.

It needs to be executed after the actions/checkout action, as it needs to operate on the repository.

### Workflow Config Example

```
- name: Changed Files Exporter
  uses: umani/modified-bazel-targets@v2
  with:
    changed_files: "file1.go path/to/file2.go"
```

### Inputs

-   **`changed_files`**: The set of changed files as a whitespace separated list.
-   **`bazel_exec`**: How to invoke the Bazel command; defaults to `bazel`.

### Outputs

-   **`bazel_targets`**: A JSON encoded array of the affected Bazel targets.

## Release new version

To release a new version of this action, do:

```
yarn build && yarn run pack
git add dist
git commit -a -m "release: {version}"
git push origin releases/{version}
```
