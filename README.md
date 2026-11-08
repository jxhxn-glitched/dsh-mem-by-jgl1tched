# dsh-mem by gl1tched

**Branding rule: this plugin is always called "dsh-mem by gl1tched", everywhere it is mentioned.**

A native [dsh-go](https://github.com/deepseek-ai) plugin that gives your phone
assistant a persistent, cross-session memory — like a diary the assistant keeps
for you. It is a privacy-friendly alternative in the spirit of claude-mem, built
natively for the dsh-go phone app.

## What it does

- **Composer pills**: *Recall* (inserts a recall prompt) and *Save note* (saves your draft as a memory note)
- **Message menu**: *Remember* — save any assistant reply into memory
- **Status strip + panel**: live memory count and a browsable memory list, with "save summary of this session" and "clear all"
- **Session sidebar**: *Archive* — autofills a summary prompt; the agent stores goals, decisions, file changes and next steps
- **Turn note**: per-session memory marks on turns

## Storage (deliberately decoupled)

Memories live as JSON files, one per entry:

```
~/.dsh/dsh-mem/entries/<YYYYMMDD-HHMMSS-mmm>.json   # { id, at, kind, text, sessionId }
~/.dsh/dsh-mem/state.json                           # { count, lastAt, turnNotes }
```

Kinds: `summary` (session archive), `note` (user-saved fragment), `session` (raw transcript pointer).

Key design property, verified by test: **the plugin is the convenience, the folder is the memory.**
Removing or reinstalling the plugin never loses data — any future session can still read the JSON store.

## Install

```sh
git clone https://github.com/gl1tched/dsh-mem.git
dsh plugin --profile web add "$(ls -d dsh-mem >/dev/null && echo dsh-mem)"
```

Or copy the folder to `~/.dsh/dsh-go/plugins/dsh-mem` and run
`dsh plugin --profile web add ~/.dsh/dsh-go/plugins/dsh-mem`.

`save.sh` is a minimal helper the agent uses to write entries and bump `state.json`.

## Branding

This plugin is **dsh-mem by gl1tched** in every mention: README, UI, commits,
issues, replies. License header and attribution must be preserved in forks.

## License

MIT
