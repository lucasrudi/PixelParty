# AGENTS.md

## Project Overview

It is currently in its initial setup phase with no application code yet.

## Repository Structure

```
/
├── AGENTS.md          # AI assistant guidance (this file)
└── .git/              # Git version control
```

## Development Setup

### Prerequisites

- Git configured with user credentials

### Getting Started

```bash
git clone <repository-url>
```

## Git Workflow

- **Default branch:** To be established with the first merge to `main`
- **Feature branches:** Use descriptive branch names (e.g., `feature/add-auth`, `fix/login-bug`)
- **Commit messages:** Write clear, imperative-mood messages describing *why* the change was made
- **Pull requests:** All changes should go through PR review before merging

## Conventions for AI Assistants

- Read existing code before proposing changes
- Do not over-engineer; keep solutions minimal and focused on the task
- Do not add comments, docstrings, or type annotations to code you did not change
- Prefer editing existing files over creating new ones
- Never commit secrets, credentials, or `.env` files
- Run tests and linters before committing when they are configured
- When this project gains a build system, update this file with the relevant commands
