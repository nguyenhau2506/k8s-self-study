# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository purpose

This is a **documentation-only** repository — a Vietnamese-language Kubernetes study note set following the CKA (Certified Kubernetes Administrator) roadmap. There is no build, test, or lint step. Work here means writing, editing, and reorganizing Markdown.

All authored notes are in **Vietnamese**. Match that language when adding or editing content. Technical terms (Pod, Deployment, kube-apiserver, etc.) stay in English.

## Repository layout

Custom notes are organized by CKA learning stage. Each stage is a top-level folder; files inside are numerically prefixed to encode reading order:

- `introduction/` — Docker/containerd, K8s architecture overview
- `core-concept/` — split into `master-node/`, `worker-node/`, `storage/`
- `scheduling/`
- `application-manager/` — application lifecycle (rolling update, ConfigMap, Secret, HPA…)
- `cluster maintenance/` — note the space in the folder name; URL-encode as `cluster%20maintenance` in Markdown links
- `security/`
- `tip/` — exam/practical tips
- `bai-tap/` — quiz/exercise sets ("vòng") for self-review

Two index files at the repo root must be kept in sync when notes are added, renamed, or reordered:

- [README.md](README.md) — the public-facing index with topic tables
- [LEARNING_PATH.md](LEARNING_PATH.md) — the ordered reading path with per-stage learning objectives

The CKA course lab materials are **not bundled** in this repo — they live upstream at KodeKloud's [certified-kubernetes-administrator-course](https://github.com/kodekloudhub/certified-kubernetes-administrator-course) (labs, mock exams, kubeadm cluster setups). Reference it read-only from there.

## Conventions for note files

Existing notes follow a consistent structure. New notes should match it:

1. `# Title` (Vietnamese)
2. **Tổng quan lý thuyết** — why this concept exists, plain-language overview
3. **Kiến thức chi tiết** — architecture, internals, mechanics
4. **Ví dụ thực tế** — YAML manifests and `kubectl` commands
5. **So sánh & phân biệt** — contrast with related concepts (e.g., Taints vs Affinity, Role vs ClusterRole)
6. **Câu hỏi gợi mở** — open questions for self-check

Other conventions observed across the repo:

- File names use `NN-kebab-case.md` where `NN` is the in-stage ordering (e.g., `03-taints-and-tolerations.md`). When inserting a note mid-sequence, renumber subsequent files and update both index files.
- ASCII diagrams (box-drawing characters) are used heavily for architecture flows — keep this style instead of switching to mermaid/images.
- Tables are used for component comparisons and command cheat-sheets.
- Code fences are annotated (`yaml`, `bash`) so callouts render properly.

## Updating the indexes

When you add, rename, or reorder a note, update **both** index files in the same change:

- README.md — find the section table for that stage and add/update the row. Keep the "Nội dung chính" column short (a single phrase summarizing the topic, matching the tone of surrounding rows).
- LEARNING_PATH.md — append/insert into the numbered list for that stage. If the new topic affects the stage's "Mục tiêu cần nắm" objectives, update those too.

Both indexes also reference the stage order in the roadmap diagram in README.md (`Introduction → Core Concepts → … → Security`). If you introduce a new top-level stage, update that diagram as well.

## Linking conventions

- Use relative paths from the repo root: `[Pod](core-concept/worker-node/05-kube-pod.md)`.
- For the `cluster maintenance/` folder (contains a space), URL-encode the space: `cluster%20maintenance/01-os-upgrade.md`.
- This is a VS Code extension context — when referencing files in chat replies, use the `[file.md](path/file.md)` or `[file.md:42](path/file.md#L42)` markdown form so they're clickable.
