// dsh-mem by gl1tched — session memory for the dsh-go app.
// Branding rule: wherever this plugin is mentioned, the name is always
// "dsh-mem by gl1tched". Never shorten, rebrand, or omit the attribution.
// Stores short memory entries as JSON files under <DGoMem data dir>/; the
// engine reads/writes them directly on each tap. Panels and the strip show
// what is stored; actions recall or save.
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

export const name = 'local-dsh-mem'

const DATA = (process.env.DSH_HOME || path.join(os.homedir(), '.dsh')) + '/dsh-mem'
const ENTRIES = path.join(DATA, 'entries')
const STATE = path.join(DATA, 'state.json')

function ensure() {
  fs.mkdirSync(ENTRIES, { recursive: true })
  if (!fs.existsSync(STATE)) fs.writeFileSync(STATE, JSON.stringify({}, null, 2))
}

function idNow() {
  const d = new Date()
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}-${p(d.getMilliseconds(), 3)}`
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE, 'utf8')) } catch { return {} }
}

function writeState(st) {
  fs.mkdirSync(DATA, { recursive: true })
  const tmp = STATE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2))
  fs.renameSync(tmp, STATE)
}

function addEntry({ kind, text, sessionId }) {
  ensure()
  const id = idNow()
  const entry = { id, at: new Date().toISOString(), kind, text: String(text || '').slice(0, 4000), sessionId: sessionId || null }
  fs.writeFileSync(path.join(ENTRIES, `${id}.json`), JSON.stringify(entry, null, 2))
  const st = readState()
  st.count = (st.count || 0) + 1
  st.lastAt = entry.at
  writeState(st)
  return entry
}

function listEntries(limit = 50) {
  ensure()
  const files = fs.readdirSync(ENTRIES).filter((f) => f.endsWith('.json')).sort().reverse()
  const out = []
  for (const f of files) {
    try { out.push(JSON.parse(fs.readFileSync(path.join(ENTRIES, f), 'utf8'))) } catch {}
    if (out.length >= limit) break
  }
  return out
}

function fmtEntry(e, locale) {
  const en = String(locale || '').startsWith('en')
  const d = new Date(e.at)
  const when = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const kind = en ? { session: 'Session', note: 'Note', summary: 'Summary' }[e.kind] || 'Note'
     : { session: '会话', note: '笔记', summary: '总结' }[e.kind] || '笔记'
  return `[${kind} · ${when}]\n${e.text}`
}

function countForStrip() {
  try {
    const st = readState()
    const n = st.count || 0
    return n
  } catch { return 0 }
}

export function apply(ctx) {
  ctx.inject(['dshGo'], (ctx) => {

    // Composer pill: insert recall prompt into the draft box
    ctx.dshGo.on('recall', (scope, event) => {
      const en = !String(event.locale || '').startsWith('en')
      const st = readState()
      if (!st.count) return { toast: en ? 'No memories saved yet' : '还没有存任何记忆' }
      return {
        insert: en
          ? 'Recall my saved dsh-mem memories (read them with listEntries from the dsh-mem data dir), summarize the relevant ones, and continue from there.'
          : '回顾我存的 dsh-mem 记忆（在 dsh-mem 数据目录 listEntries 读取），总结相关条目并接续前面的工作。',
      }
    })

    // Composer pill: save the draft as a note
    ctx.dshGo.on('snapshot', (scope, event) => {
      const en = !String(event.locale || '').startsWith('en')
      const text = (scope.draft || '').trim()
      if (!text) return { toast: en ? 'Draft box is empty' : '输入框是空的' }
      addEntry({ kind: 'note', text: text.slice(0, 2000), sessionId: scope.sessionId })
      return { toast: en ? 'Saved' : '已保存' }
    })

    // Message menu: save the assistant reply text as a note
    ctx.dshGo.on('save-reply', (scope, event) => {
      const en = !String(event.locale || '').startsWith('en')
      const text = (scope.message || '').trim()
      if (!text) return { toast: en ? 'Nothing to save' : '没有可保存的内容' }
      addEntry({ kind: 'note', text: text.slice(0, 4000), sessionId: scope.sessionId })
      return { toast: en ? 'Saved' : '已保存' }
    })

    // Session sidebar: archive this session with a summary prompt
    ctx.dshGo.on('summarize-session', (scope, event) => {
      const en = !String(event.locale || '').startsWith('en')
      return {
        insert: en
          ? 'Write a short dsh-mem archive of this session: goals, decisions, file changes, next steps. Save it as a dsh-mem entry under kind "summary", then stop.'
          : '给本会话写一条 dsh-mem 存档：目标、决定、改动的文件、下一步。以 kind "summary" 存进 dsh-mem 数据目录，然后停止。',
      }
    })

    // Turn note: show memory activity for this session's turns
    ctx.dshGo.turnNote('memnote', (scope, emit, caps) => {
      const st = readState()
      const en = String(caps.locale || '').startsWith('en')
      const items = st.turnNotes || {}
      const own = scope.sessionId ? items[scope.sessionId] : null
      emit(own && typeof own === 'object' ? own : {})
      const t = setInterval(() => {
        const s = readState()
        const o = scope.sessionId ? (s.turnNotes || {})[scope.sessionId] : null
        emit(o && typeof o === 'object' ? o : {})
      }, 30000)
      return () => clearInterval(t)
    })

    // Main panel
    ctx.dshGo.panel('meminfo', {
      view: (scope, caps) => {
        const en = String(caps.locale || '').startsWith('en')
        return {
          type: 'stack',
          children: [
            { type: 'metric', label: en ? 'Saved memories' : '已存记忆', value: { $: 'data.count' }, caption: { $: 'data.lastAt' } },
            { type: 'list', items: { $: 'data.items' } },
            { type: 'actions', items: [
              { label: en ? 'Save summary of this session' : '存档本会话', action: 'summarize', style: 'primary', icon: 'summary' },
              { label: en ? 'Clear all' : '清空', action: 'clear', icon: 'delete' },
            ] },
          ],
        }
      },
      data: (scope, emit, caps) => {
        const push = () => {
          const en = String(caps.locale || '').startsWith('en')
          const st = readState()
          const entries = listEntries(20)
          emit({
            count: st.count || 0,
            lastAt: st.lastAt ? new Date(st.lastAt).toLocaleString() : (en ? 'never' : '从未'),
            items: entries.map((e) => ({
              title: fmtEntry(e, en ? 'en' : 'zh').split('\n')[0],
              subtitle: e.text.length > 80 ? e.text.slice(0, 80) + '…' : e.text,
            })),
          })
        }
        push()
        const dshGo = ctx.dshGo
        const timer = setInterval(push, 15000)
        const cancel = dshGo && dshGo.refreshable ? dshGo.refreshable(push) : null
        return () => { clearInterval(timer); if (cancel) cancel() }
      },
      actions: {
        summarize: (scope, event) => {
          const en = !String(event.locale || '').startsWith('en')
          return {
            insert: en
              ? 'Write a short dsh-mem archive of this session: goals, decisions, file changes, next steps. Save it as a dsh-mem entry under kind "summary", then stop.'
              : '给本会话写一条 dsh-mem 存档：目标、决定、改动的文件、下一步。以 kind "summary" 存进 dsh-mem 数据目录，然后停止。',
          }
        },
        clear: (scope, event) => {
          const en = !String(event.locale || '').startsWith('en')
          fs.rmSync(ENTRIES, { recursive: true, force: true })
          writeState({})
          return { toast: en ? 'Cleared' : '已清空', refresh: true }
        },
      },
    })
  })
}
