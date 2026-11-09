window.__ModuleLoader__.load({
  id: '@local/dsh-mem-panel',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const STORE = '/api/dsh-mem/list';

    async function fetchEntries() {
      try {
        const res = await fetch(STORE, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        return Array.isArray(data.entries) ? data.entries : [];
      } catch {
        return null;
      }
    }

    function DiaryPanel() {
      const [entries, setEntries] = React.useState(null); // null = loading, [] = empty
      const [busy, setBusy] = React.useState(false);
      const [reloadKey, setReloadKey] = React.useState(0);

      React.useEffect(() => {
        let alive = true;
        setEntries(null);
        fetchEntries().then((list) => { if (alive) setEntries(list === null ? [] : list); });
        return () => { alive = false; };
      }, [reloadKey]);

      const summarize = () => {
        const box = document.querySelector('textarea');
        if (box && 'value' in box) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(box, 'Write a short dsh-mem archive of this session: goals, decisions, file changes, next steps. Save it as a dsh-mem entry under kind "summary" (use ~/.dsh/skills or ask the agent to write the JSON file), then stop.');
          box.dispatchEvent(new Event('input', { bubbles: true }));
          box.focus();
        }
      };

      const recall = () => {
        const box = document.querySelector('textarea');
        if (box && 'value' in box) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
          setter.call(box, 'Recall my saved dsh-mem memories (read ~/.dsh/dsh-mem/entries/*.json), summarize the relevant ones, and continue from there.');
          box.dispatchEvent(new Event('input', { bubbles: true }));
          box.focus();
        }
      };

      const clearAll = async () => {
        if (busy) return;
        setBusy(true);
        try {
          await fetch('/api/dsh-mem/clear', { method: 'POST' });
          setReloadKey((k) => k + 1);
        } finally {
          setBusy(false);
        }
      };

      const style = {
        margin: '8px 0',
        padding: '10px 12px',
        border: '1px solid var(--dsw-alias-border-strong, rgba(128,128,128,.35))',
        borderRadius: 10,
        background: 'var(--dsw-alias-surface, transparent)',
        color: 'var(--dsw-alias-text, inherit)',
        fontSize: 13,
        lineHeight: 1.5,
      };
      const row = {
        display: 'flex', alignItems: 'baseline', gap: 8,
        padding: '6px 0', borderBottom: '1px solid var(--dsw-alias-border, rgba(128,128,128,.2))',
      };
      const btn = {
        padding: '4px 10px', borderRadius: 8, fontSize: 12,
        border: '1px solid var(--dsw-alias-border-strong, rgba(128,128,128,.35))',
        background: 'var(--dsw-alias-button-bg, transparent)',
        color: 'var(--dsw-alias-text, inherit)', cursor: 'pointer',
      };
      const primary = { ...btn, background: 'var(--dsw-alias-accent, #247bbf)', color: '#fff', borderColor: 'transparent' };

      return h('div', { style, 'data-dsh-mem': 'panel' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
          h('strong', null, 'dsh-mem by jgl1tched'),
          h('span', { style: { opacity: 0.6, fontSize: 12 } },
            entries === null ? 'loading…' : `${entries.length} memor${entries.length === 1 ? 'y' : 'ies'}`),
          h('span', { style: { flex: 1 } }),
          h('button', { style: btn, onClick: recall }, 'Recall'),
          h('button', { style: primary, onClick: summarize }, 'Archive session')),
        entries !== null && entries.length === 0
          ? h('div', { style: { opacity: 0.6 } }, 'No memories saved yet.')
          : (entries || []).slice(0, 20).map((e) => h('div', { key: e.id, style: row },
              h('span', { style: { opacity: 0.55, fontSize: 11, whiteSpace: 'nowrap' } }, (e.at || '').slice(0, 16).replace('T', ' ')),
              h('span', { style: {} }, (e.text || '').length > 90 ? (e.text || '').slice(0, 90) + '…' : (e.text || '')))),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
          h('button', { style: btn, onClick: () => setReloadKey((k) => k + 1) }, 'Refresh'),
          h('button', { style: { ...btn, color: 'var(--dsw-alias-danger, #c0392b)' }, onClick: clearAll, disabled: busy }, busy ? 'Clearing…' : 'Clear all')));
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock', id: 'dsh-mem-diary', order: 5,
        }, DiaryPanel));
      },
    };
  },
});
