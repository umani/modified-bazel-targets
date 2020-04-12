# Modified Bazel Targets Action

This GitHub action applies to pull requests and populates an output variable with the set of Bazel targets that have changed (including dependencies), based on the set of files that have been changed.

It needs to be executed after the actions/checkout action, as it needs to operate on the repository.

### Workflow Config Example
```
- name: Changed Files Exporter
  uses: futuratrepadeira/modified-bazel-targets@v1.0.0
  with:
    changed-files: "file1.go path/to/file2.go"
    workspace-folder: "root"
```

### Inputs
* **`changed-files`**: The set of changed files as a whitespace separated list.
* **`workspace-folder`**: The name or fill path of the workspace root.
* **`bazel-exec`**: How to invoke the Bazel command; defaults to `bazel`.

### Outputs
* **`bazel-targets`**: A JSON encoded array of the affected Bazel targets.
