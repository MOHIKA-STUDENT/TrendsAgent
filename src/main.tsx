import { FormEvent, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import type { User } from '@supabase/supabase-js'
import { ArrowUpRight, Bell, BookOpen, Bot, ChevronRight, Compass, FileText, LayoutDashboard, LogOut, Menu, MessageSquare, Plus, Search, Settings, ShieldCheck, Sparkles, Target, TrendingUp, Users, X } from 'lucide-react'
import './styles.css'
import { createWorkspace, deleteWorkspace, getWorkspaces, signIn, signOut, signUp, type Workspace } from './lib/auth'
import { getBusinessProfile, saveBusinessProfile, type BusinessProfile } from './lib/business-profile'
import { getDashboardData, saveDraftRecommendation, type DashboardData } from './lib/dashboard'
import { addSource, deleteSource, deleteMultipleSources, getSources, type SourceDocument } from './lib/sources'
import { checkSupabaseConnection, supabase } from './lib/supabase'
import { generateEvidenceBrief, sendAIChatMessage, type EvidenceBrief } from './lib/ai'

type NavItem = { label: string; icon: typeof LayoutDashboard }
const navItems: NavItem[] = [{ label: 'Overview', icon: LayoutDashboard }, { label: 'Trend intelligence', icon: TrendingUp }, { label: 'Competitors', icon: Users }, { label: 'Recommendations', icon: Sparkles }, { label: 'Reports', icon: FileText }, { label: 'Knowledge base', icon: BookOpen }]

function App() {
  const [user, setUser] = useState<User | null>(null); const [loading, setLoading] = useState(true); const [workspaces, setWorkspaces] = useState<Workspace[]>([]); const [activeWorkspaceIndex, setActiveWorkspaceIndex] = useState(0); const [profile, setProfile] = useState<BusinessProfile | null | undefined>(undefined)
  useEffect(() => { if (!supabase) { setLoading(false); return }; void supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setLoading(false) }); const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null)); return () => listener.subscription.unsubscribe() }, [])
  useEffect(() => { if (user) void getWorkspaces(user).then((ws) => { setWorkspaces(ws); setActiveWorkspaceIndex(0) }).catch(() => setWorkspaces([])); else { setWorkspaces([]); setProfile(undefined) } }, [user])
  
  const currentWorkspace = workspaces[activeWorkspaceIndex] || workspaces[0]
  useEffect(() => { if (currentWorkspace) void getBusinessProfile(currentWorkspace.id).then(setProfile).catch(() => setProfile(null)) }, [currentWorkspace])
  if (loading) return <Loading label="Loading your secure workspace…" />
  if (!user) return <AuthScreen />
  if (workspaces.length === 0) return <WorkspaceSetup user={user} onCreated={(workspace) => setWorkspaces([workspace])} />
  if (profile === undefined) return <Loading label="Preparing your business profile…" />
  if (!profile) return <BusinessProfileSetup workspace={currentWorkspace} onSaved={setProfile} />
  if (window.location.hash === '#sources') return <EvidenceLibrary workspace={currentWorkspace} workspaces={workspaces} activeIndex={activeWorkspaceIndex} onSelectWorkspace={setActiveWorkspaceIndex} />
  if (window.location.hash === '#brief') return <EvidenceBriefPage workspace={currentWorkspace} />
  if (window.location.hash === '#chat') return <AIChatPage workspace={currentWorkspace} profile={profile} />
  if (window.location.hash === '#profile') return <ProfileEditor workspace={currentWorkspace} profile={profile} onSaved={setProfile} />
  return <Dashboard user={user} workspace={currentWorkspace} profile={profile} workspaces={workspaces} activeIndex={activeWorkspaceIndex} onSelectWorkspace={setActiveWorkspaceIndex} />
}

function Loading({ label }: { label: string }) { return <main className="auth-page"><div className="loading-mark"><Sparkles size={22} /></div><p>{label}</p></main> }

function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup'); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setMessage(''); const form = new FormData(event.currentTarget); try { const email = String(form.get('email')); const password = String(form.get('password')); if (mode === 'signin') await signIn(email, password); else { await signUp(String(form.get('name')), email, password); setMessage('Check your email to confirm your account, then sign in.') } } catch (error) { setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.') } finally { setBusy(false) } }
  return <main className="auth-page"><section className="auth-card"><div className="auth-brand"><span className="brand-mark"><Sparkles size={17} /></span>Trends<span>Agent</span></div><span className="security-note"><ShieldCheck size={15} /> Secure workspace access</span><h1>{mode === 'signup' ? 'Build with better signals.' : 'Welcome back.'}</h1><p>{mode === 'signup' ? 'Create your account to begin building an evidence-backed marketing system.' : 'Sign in to your private intelligence workspace.'}</p><form onSubmit={submit}>{mode === 'signup' && <label>Full name<input name="name" required placeholder="Your name" /></label>}<label>Email address<input name="email" type="email" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" required minLength={8} placeholder="At least 8 characters" /></label>{message && <p className="form-message">{message}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create secure account' : 'Sign in securely'}<ChevronRight size={17} /></button></form><p className="switch-auth">{mode === 'signup' ? 'Already have an account?' : 'New to TrendsAgent?'} <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage('') }}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</button></p></section></main>
}

function WorkspaceSetup({ user, onCreated }: { user: User; onCreated: (workspace: Workspace) => void }) {
  const [name, setName] = useState(`${user.user_metadata.full_name || 'My'}'s workspace`); const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(''); try { onCreated(await createWorkspace(name)) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create workspace.') } finally { setBusy(false) } }
  return <main className="auth-page"><section className="auth-card workspace-card"><span className="setup-icon"><Users size={22} /></span><p className="eyebrow">STEP 1 OF 3</p><h1>Create your workspace</h1><p>A workspace keeps your business profile, sources, and future AI recommendations private to you and your team.</p><form onSubmit={submit}><label>Workspace name<input value={name} onChange={(event) => setName(event.target.value)} required maxLength={120} /></label>{error && <p className="form-message">{error}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}<ChevronRight size={17} /></button></form><button className="signout-link" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button></section></main>
}

function BusinessProfileSetup({ workspace, onSaved }: { workspace: Workspace; onSaved: (profile: BusinessProfile) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [goals, setGoals] = useState<string[]>([]); const goalOptions = ['Grow brand awareness', 'Generate leads', 'Increase sales', 'Build customer trust']
  function toggleGoal(goal: string) { setGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]) }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); const profile: BusinessProfile = { business_name: String(form.get('business_name')), industry: String(form.get('industry')) || null, description: String(form.get('description')) || null, target_audience: String(form.get('target_audience')) || null, brand_voice: String(form.get('brand_voice')) || null, marketing_goals: goals }; const competitors = [String(form.get('competitor_1')), String(form.get('competitor_2')), String(form.get('competitor_3'))]; try { await saveBusinessProfile(workspace, profile, competitors); onSaved(profile) } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your profile.') } finally { setBusy(false) } }
  return <main className="auth-page profile-onboarding"><section className="auth-card profile-card"><span className="setup-icon"><Compass size={22} /></span><p className="eyebrow">STEP 2 OF 3 · BUSINESS CONTEXT</p><h1>Teach TrendsAgent about your business</h1><p>This information stays in <b>{workspace.name}</b>. It will be used as grounded context for future recommendations, never as a replacement for evidence.</p><form onSubmit={submit}><div className="form-grid"><label>Business name<input name="business_name" required maxLength={160} placeholder="e.g. Bloom Studio" /></label><label>Industry<input name="industry" placeholder="e.g. Wellness" /></label></div><label>What do you do?<textarea name="description" placeholder="A short description of your product or service" maxLength={1000} /></label><label>Who is your ideal audience?<textarea name="target_audience" placeholder="e.g. Women aged 25–40 who want simple, sustainable skincare" maxLength={1000} /></label><label>Brand voice<input name="brand_voice" placeholder="e.g. Warm, practical, and encouraging" maxLength={240} /></label><fieldset><legend>Marketing goals</legend><div className="goal-options">{goalOptions.map((goal) => <button type="button" key={goal} className={goals.includes(goal) ? 'goal selected' : 'goal'} onClick={() => toggleGoal(goal)}>{goal}</button>)}</div></fieldset><label>Competitor 1 <span className="optional">optional</span><input name="competitor_1" placeholder="Business name" /></label><label>Competitor 2 <span className="optional">optional</span><input name="competitor_2" placeholder="Business name" /></label><label>Competitor 3 <span className="optional">optional</span><input name="competitor_3" placeholder="Business name" /></label>{error && <p className="form-message">{error}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Saving securely…' : 'Save and open dashboard'}<ChevronRight size={17} /></button></form></section></main>
}

function EvidenceLibrary({ workspace, workspaces, activeIndex, onSelectWorkspace }: { workspace: Workspace; workspaces?: Workspace[]; activeIndex?: number; onSelectWorkspace?: (idx: number) => void }) {
  const [sources, setSources] = useState<SourceDocument[]>([]); const [selectedIds, setSelectedIds] = useState<string[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [copyMessage, setCopyMessage] = useState('')
  function refresh() { void getSources(workspace).then(setSources).catch((error: Error) => setMessage(error.message)) }
  useEffect(refresh, [workspace.id])
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setMessage(''); const form = new FormData(event.currentTarget); try { await addSource(workspace, { title: String(form.get('title')), sourceUrl: String(form.get('source_url')), publishedAt: String(form.get('published_at')), content: String(form.get('content')) }); event.currentTarget.reset(); setMessage('Evidence saved. It can now be used by the AI gateway after deployment.'); refresh() } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save this source.') } finally { setBusy(false) } }
  async function remove(source: SourceDocument) { if (!window.confirm(`Delete “${source.title}”? This cannot be undone.`)) return; setBusy(true); setMessage(''); try { await deleteSource(workspace, source.id); setMessage('Evidence deleted. It is no longer available to AI requests.'); refresh() } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete this source.') } finally { setBusy(false) } }
  function toggleSelect(id: string) { setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])) }
  function toggleSelectAll() { if (selectedIds.length === sources.length) setSelectedIds([]); else setSelectedIds(sources.map((s) => s.id)) }
  async function removeBatch() {
    if (!selectedIds.length) return
    if (!window.confirm(`Delete ${selectedIds.length} selected source(s)? This cannot be undone.`)) return
    setBusy(true); setMessage('')
    try {
      await deleteMultipleSources(workspace, selectedIds)
      setSelectedIds([])
      setMessage(`${selectedIds.length} source(s) deleted.`)
      refresh()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete selected sources.') }
    finally { setBusy(false) }
  }
  async function copyWorkspaceId() { try { await navigator.clipboard.writeText(workspace.id); setCopyMessage('Copied. Paste this into n8n.'); } catch { setCopyMessage('Copy failed. Select the ID shown below instead.'); } }
  return <main className="library-page"><header className="library-header"><div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>Trends<span>Agent</span></span></div><div className="library-actions"><button className="outline-button" onClick={() => { window.location.hash = 'profile'; window.location.reload() }}>Edit profile</button><button className="outline-button" onClick={() => { window.location.hash = ''; window.location.reload() }}>Dashboard</button></div></header><section className="library-content"><p className="eyebrow">PHASE 7 · EVIDENCE LIBRARY</p><h1>Approved sources for {workspace.name}</h1><p className="subhead">Add material you trust. The AI will use only saved text and cite it in factual responses.</p><aside className="automation-helper"><div><b>n8n workspace connection</b><p>Copy this exact workspace ID into the <code>workspaceId</code> field of your n8n Save approved trend evidence node.</p><code>{workspace.id}</code>{copyMessage && <small>{copyMessage}</small>}</div><button className="outline-button" onClick={() => void copyWorkspaceId()}>Copy workspace ID</button></aside><div className="library-grid"><section className="card source-form"><h2>Add a source</h2><form onSubmit={submit}><label>Source title<input name="title" required maxLength={240} placeholder="e.g. Q2 customer survey" /></label><label>Source URL <span className="optional">optional</span><input name="source_url" type="url" placeholder="https://…" /></label><label>Published date <span className="optional">optional</span><input name="published_at" type="date" /></label><label>Source text or notes<textarea name="content" required minLength={30} maxLength={25000} placeholder="Paste verified material here." /></label><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save approved source'}<ChevronRight size={17} /></button></form>{message && <p className="library-message">{message}</p>}</section><section className="card source-list"><div className="card-heading"><div><p className="eyebrow">SAVED EVIDENCE</p><h2>{sources.length} source{sources.length === 1 ? '' : 's'} available</h2></div><button className="outline-button" onClick={refresh}><Sparkles size={14} /> Refresh list</button></div>{sources.length > 0 && <div className="batch-actions-bar"><label className="checkbox-label"><input type="checkbox" checked={selectedIds.length === sources.length && sources.length > 0} onChange={toggleSelectAll} /> Select all ({sources.length})</label>{selectedIds.length > 0 && <button className="delete-button batch-delete" disabled={busy} onClick={() => void removeBatch()}>Delete selected ({selectedIds.length})</button>}</div>}{sources.length === 0 ? <div className="empty-state"><BookOpen size={21} /><b>No evidence saved yet</b><p>Click "Refresh list" above or run your n8n workflow to pull in saved YouTube, News, and Wikipedia evidence.</p></div> : <div className="source-items">{sources.map((source) => <article key={source.id} className={selectedIds.includes(source.id) ? 'selected-item' : ''}><input type="checkbox" checked={selectedIds.includes(source.id)} onChange={() => toggleSelect(source.id)} /><div><b>{source.title}</b><small>{source.source_url || 'Private workspace note'} · {source.published_at || 'Date not recorded'}</small><span className="source-tag">{source.source_type}</span></div><button className="delete-button" disabled={busy} onClick={() => void remove(source)}>Delete</button></article>)}</div>}</section></div></section></main>
}

function FormattedBriefOutput({ content }: { content: string }) {
  const lines = content.split('\n')
  return (
    <div className="brief-output-formatted">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="brief-spacer" />
        if (trimmed.startsWith('# ')) {
          return <h2 key={idx} className="brief-h1">{renderInline(trimmed.replace(/^#\s+/, ''))}</h2>
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={idx} className="brief-h2">{renderInline(trimmed.replace(/^##\s+/, ''))}</h3>
        }
        if (trimmed.startsWith('### ')) {
          return <h4 key={idx} className="brief-h3">{renderInline(trimmed.replace(/^###\s+/, ''))}</h4>
        }
        if (/^[\-\*]\s+/.test(trimmed)) {
          return <div key={idx} className="brief-list-item"><span className="brief-bullet">•</span><div>{renderInline(trimmed.replace(/^[\-\*]\s+/, ''))}</div></div>
        }
        if (/^\d+\.\s+/.test(trimmed)) {
          const match = trimmed.match(/^(\d+)\.\s+(.*)/)
          return <div key={idx} className="brief-list-item"><span className="brief-num">{match?.[1]}.</span><div>{renderInline(match?.[2] || '')}</div></div>
        }
        return <p key={idx} className="brief-p">{renderInline(trimmed)}</p>
      })}
    </div>
  )
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[\d+\])/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (/^\[\d+\]$/.test(part)) {
      return <span key={i} className="brief-cite">{part}</span>
    }
    return part
  })
}

function EvidenceBriefPage({ workspace }: { workspace: Workspace }) {
  const [brief, setBrief] = useState<EvidenceBrief | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function runBrief() {
    setBusy(true); setError('')
    try { setBrief(await generateEvidenceBrief(workspace.id)) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not generate an evidence brief.') }
    finally { setBusy(false) }
  }
  return <main className="library-page"><header className="library-header"><div className="brand"><span className="brand-mark"><Sparkles size={17} /></span><span>Trends<span>Agent</span></span></div><div className="library-actions"><button className="outline-button" onClick={() => { window.location.hash = ''; window.location.reload() }}>Dashboard</button><button className="outline-button" onClick={() => { window.location.hash = 'sources'; window.location.reload() }}>Knowledge base</button></div></header><section className="brief-page"><p className="eyebrow">PHASE 8 · EVIDENCE BRIEF</p><h1>What your saved evidence can support</h1><p className="subhead">This creates an on-demand brief from saved sources only. It cites sources and labels uncertainty; it does not save recommendations automatically.</p><section className="card brief-intro"><div><b>Ready to analyze {workspace.name}</b><p>The AI receives the eight most recent approved sources. Your provider API key stays on the server.</p></div><button className="primary-button" disabled={busy} onClick={() => void runBrief()}><Bot size={17} />{busy ? 'Reading evidence…' : 'Generate evidence brief'}</button></section>{error && <p className="brief-error">{error}</p>}{brief && <section className="card brief-result"><div className="card-heading"><div><p className="eyebrow">GROUNDED SUMMARY</p><h2>Evidence brief</h2></div><span className="priority">ON-DEMAND</span></div><FormattedBriefOutput content={brief.output} /><div className="brief-sources"><b>Sources supplied to the AI</b>{brief.evidence.map((source, index) => <a key={source.id} href={source.sourceUrl ?? undefined} target="_blank" rel="noreferrer">[{index + 1}] {source.title}</a>)}</div><small className="brief-meta">Model: {brief.model} via {brief.provider}. Review the original sources before acting on an interpretation.</small></section>}</section></main>
}

function AIChatPage({ workspace, profile }: { workspace: Workspace; profile: BusinessProfile }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string; evidence?: EvidenceBrief['evidence']; provider?: string; model?: string }>>([
    {
      role: 'assistant',
      content: `Hello! I am your **TrendsAgent OS Assistant** for **${profile.business_name}**.\n\nI continuously analyze your saved market evidence, YouTube video signals, and industry news. How can I help you today?`,
    },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!input.trim() || busy) return
    const userMsg = input.trim()
    setInput('')
    setError('')
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }])
    setBusy(true)

    try {
      const res = await sendAIChatMessage(workspace.id, userMsg)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.output,
          evidence: res.evidence,
          provider: res.provider,
          model: res.model,
        },
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not retrieve AI response.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="library-page">
      <header className="library-header">
        <div className="brand">
          <span className="brand-mark"><Sparkles size={17} /></span>
          <span>Trends<span>Agent Chat</span></span>
        </div>
        <div className="library-actions">
          <button className="outline-button" onClick={() => { window.location.hash = ''; window.location.reload() }}>Dashboard</button>
          <button className="outline-button" onClick={() => { window.location.hash = 'brief'; window.location.reload() }}>Evidence Brief</button>
          <button className="outline-button" onClick={() => { window.location.hash = 'sources'; window.location.reload() }}>Knowledge Base</button>
        </div>
      </header>
      <section className="chat-page-container">
        <div className="chat-header-banner">
          <div className="eyebrow">AI CONTENT INTELLIGENCE CHAT</div>
          <h2>Ask TrendsAgent for {profile.business_name}</h2>
          <p>Answers are strictly grounded in your database evidence to prevent AI hallucination.</p>
        </div>
        <div className="chat-messages-box">
          {messages.map((msg, i) => (
            <div key={i} className={msg.role === 'user' ? 'chat-bubble user-bubble' : 'chat-bubble ai-bubble'}>
              <div className="chat-author">
                {msg.role === 'user' ? <b>You</b> : <b><Bot size={15} /> TrendsAgent AI</b>}
              </div>
              <FormattedBriefOutput content={msg.content} />
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="brief-sources">
                  <b>Supplied Sources:</b>
                  {msg.evidence.map((src, idx) => (
                    <a key={src.id} href={src.sourceUrl ?? undefined} target="_blank" rel="noreferrer">
                      [{idx + 1}] {src.title}
                    </a>
                  ))}
                </div>
              )}
              {msg.model && <small className="brief-meta">Model: {msg.model} via {msg.provider}</small>}
            </div>
          ))}
          {busy && (
            <div className="chat-bubble ai-bubble thinking">
              <Sparkles size={16} className="spin" /> Reasoning over saved evidence & business profile...
            </div>
          )}
        </div>
        {error && <p className="brief-error">{error}</p>}
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about marketing campaigns, competitor moves, or trends for ${profile.business_name}...`}
            disabled={busy}
          />
          <button className="primary-button" disabled={busy || !input.trim()}>
            Send <ChevronRight size={17} />
          </button>
        </form>
      </section>
    </main>
  )
}



function ProfileEditor({ workspace, profile, onSaved }: { workspace: Workspace; profile: BusinessProfile; onSaved: (profile: BusinessProfile) => void }) {
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const [goals, setGoals] = useState(profile.marketing_goals); const options = ['Grow brand awareness', 'Generate leads', 'Increase sales', 'Build customer trust']
  function toggle(goal: string) { setGoals((current) => current.includes(goal) ? current.filter((item) => item !== goal) : [...current, goal]) }
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setMessage(''); const form = new FormData(event.currentTarget); const updated: BusinessProfile = { business_name: String(form.get('business_name')), industry: String(form.get('industry')) || null, description: String(form.get('description')) || null, target_audience: String(form.get('target_audience')) || null, brand_voice: String(form.get('brand_voice')) || null, marketing_goals: goals }; try { await saveBusinessProfile(workspace, updated, []); onSaved(updated); setMessage('Business profile updated successfully.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update your profile.') } finally { setBusy(false) } }
  async function handleDeleteWorkspace() {
    const confirmation = window.prompt(`DANGER: Are you sure you want to permanently delete workspace "${workspace.name}" and ALL evidence, signals, & data?\n\nType "${workspace.name}" below to confirm:`)
    if (confirmation !== workspace.name) {
      alert('Workspace deletion canceled. Workspace name did not match.')
      return
    }
    setBusy(true); setMessage('')
    try {
      await deleteWorkspace(workspace.id)
      window.location.hash = ''
      window.location.reload()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not delete workspace.')
    } finally { setBusy(false) }
  }
  return <main className="auth-page profile-onboarding"><section className="auth-card profile-card"><button className="back-link" onClick={() => { window.location.hash = 'sources'; window.location.reload() }}>← Back to evidence</button><p className="eyebrow">WORKSPACE SETTINGS</p><h1>Edit business profile</h1><p>Changes update the private context used by future AI requests. They do not change existing evidence.</p><form onSubmit={submit}><div className="form-grid"><label>Business name<input name="business_name" required defaultValue={profile.business_name} /></label><label>Industry<input name="industry" defaultValue={profile.industry ?? ''} /></label></div><label>What do you do?<textarea name="description" defaultValue={profile.description ?? ''} /></label><label>Who is your ideal audience?<textarea name="target_audience" defaultValue={profile.target_audience ?? ''} /></label><label>Brand voice<input name="brand_voice" defaultValue={profile.brand_voice ?? ''} /></label><fieldset><legend>Marketing goals</legend><div className="goal-options">{options.map((goal) => <button type="button" key={goal} className={goals.includes(goal) ? 'goal selected' : 'goal'} onClick={() => toggle(goal)}>{goal}</button>)}</div></fieldset>{message && <p className="library-message">{message}</p>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Save profile changes'}<ChevronRight size={17} /></button></form><div className="danger-zone-card"><h3>Danger Zone</h3><p>Permanently delete workspace "{workspace.name}" and all associated evidence, trend signals, and AI briefs.</p><button className="delete-button danger-delete-btn" disabled={busy} onClick={() => void handleDeleteWorkspace()}>{busy ? 'Deleting workspace…' : 'Delete Workspace Account'}</button></div></section></main>
}

function Dashboard({ user, workspace, profile, workspaces, activeIndex, onSelectWorkspace }: { user: User; workspace: Workspace; profile: BusinessProfile; workspaces?: Workspace[]; activeIndex?: number; onSelectWorkspace?: (idx: number) => void }) {
  const [activePage, setActivePage] = useState('Overview'); const [connection, setConnection] = useState({ ok: false, message: 'Checking secure backend…' }); const [data, setData] = useState<DashboardData | null>(null); const [sources, setSources] = useState<SourceDocument[]>([]); const [saving, setSaving] = useState(false); const [saveMessage, setSaveMessage] = useState(''); const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const firstName = (user.user_metadata.full_name || user.email || 'there').split(' ')[0]
  function refresh() {
    void getDashboardData(workspace).then(setData).catch(() => setData(null))
    void getSources(workspace).then(setSources).catch(() => setSources([]))
  }
  useEffect(() => { void checkSupabaseConnection().then(setConnection); refresh() }, [workspace.id])
  useEffect(() => {
    if (activePage === 'Trend intelligence') { window.location.hash = 'brief'; window.location.reload() }
    if (activePage === 'Reports' || activePage === 'Recommendations') { window.location.hash = 'chat'; window.location.reload() }
    if (activePage === 'Knowledge base') { window.location.hash = 'sources'; window.location.reload() }
  }, [activePage])
  async function saveRecommendation() { setSaving(true); try { await saveDraftRecommendation(workspace); setSaveMessage('Saved as a planning draft.'); refresh() } catch (error) { setSaveMessage(error instanceof Error ? error.message : 'Could not save the draft.') } finally { setSaving(false) } }
  const openSources = () => { window.location.hash = 'sources'; window.location.reload() }
  return <main className="app-shell">
    <aside className={mobileMenuOpen ? 'sidebar mobile-open' : 'sidebar'}>
      <div className="brand">
        <span className="brand-mark"><Sparkles size={17} /></span>
        <span>Trends<span>Agent</span></span>
        <button className="mobile-close-btn" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={20} /></button>
      </div>
      <div className="workspace-switcher">
        <div className="workspace-avatar">{workspace.name.charAt(0).toUpperCase()}</div>
        {workspaces && workspaces.length > 1 ? (
          <select
            className="workspace-select"
            value={activeIndex ?? 0}
            onChange={(e) => onSelectWorkspace?.(Number(e.target.value))}
          >
            {workspaces.map((w, idx) => (
              <option key={w.id} value={idx}>
                {w.name} ({w.id.slice(0, 8)}...)
              </option>
            ))}
          </select>
        ) : (
          <div><b>{workspace.name}</b><small>{profile.industry || 'Business workspace'}</small></div>
        )}
      </div>
      <nav>
        <p className="nav-label">WORKSPACE</p>
        {navItems.map(({ label, icon: Icon }) => (
          <button
            key={label}
            className={activePage === label ? 'nav-item active' : 'nav-item'}
            onClick={() => {
              setMobileMenuOpen(false)
              if (label === 'Knowledge base') openSources()
              else if (label === 'Trend intelligence') { window.location.hash = 'brief'; window.location.reload() }
              else if (label === 'Reports' || label === 'Recommendations') { window.location.hash = 'chat'; window.location.reload() }
              else setActivePage(label)
            }}
          >
            <Icon size={18} />{label}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => { setMobileMenuOpen(false); window.location.hash = 'profile'; window.location.reload() }}>
          <Settings size={18} />Workspace settings
        </button>
        <button className="profile signout-profile" onClick={() => void signOut()}>
          <div className="profile-avatar">{firstName.slice(0, 2).toUpperCase()}</div>
          <div><b>{user.user_metadata.full_name || firstName}</b><small>Sign out</small></div>
          <LogOut size={15} />
        </button>
      </div>
    </aside>
    <section className="content">
      <header className="topbar">
        <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation menu">
          <Menu size={22} />
        </button>
        <div className="mobile-brand">Trends<span>Agent</span></div>
        <div className="search"><Search size={17} /><input placeholder="Search your intelligence…" aria-label="Search" /></div>
        <span className={connection.ok ? 'connection-status ready' : 'connection-status'} title={connection.message}><i />{connection.ok ? 'Backend ready' : 'Setup needed'}</span>
        <button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button>
        <button className="avatar" onClick={() => { window.location.hash = 'profile'; window.location.reload() }}>{firstName.slice(0, 2).toUpperCase()}</button>
      </header>
      <div className="page-content">
        <div className="hero-row">
          <div>
            <p className="eyebrow">{profile.business_name.toUpperCase()} · SECURE WORKSPACE</p>
            <h1>Good morning, {firstName} <span>✦</span></h1>
            <p className="subhead">Your saved context is ready. Add trusted evidence before using AI analysis.</p>
          </div>
          <button className="primary-button" onClick={openSources}><BookOpen size={18} />Add evidence</button>
        </div>
        <section className="metrics">
          <Metric icon={<Compass size={20} />} label="Business context" value="✓" suffix="" note={profile.target_audience ? 'Audience profile saved' : 'Profile needs audience'} tone="violet" />
          <Metric icon={<TrendingUp size={20} />} label="Verified trend signals" value={String(sources.length || data?.trendCount || 0)} suffix="" note="Source analysis ready" tone="blue" />
          <Metric icon={<Target size={20} />} label="Saved recommendations" value={String(data?.savedRecommendationCount ?? 0)} suffix="" note={`${data?.competitorCount ?? 0} competitors saved`} tone="orange" />
        </section>
        <div className="dashboard-grid">
          <section className="card signal-card">
            <div className="card-heading">
              <div><p className="eyebrow">WHAT'S RISING</p><h2>Verified signals</h2></div>
              <button className="text-button" onClick={openSources}>View all ({sources.length}) <ArrowUpRight size={15} /></button>
            </div>
            {sources.length === 0 ? (
              <div className="empty-state">
                <TrendingUp size={21} />
                <b>No verified signals yet</b>
                <p>Run your n8n collector workflow to ingest Google Trends, YouTube, News, and Wikipedia signals.</p>
              </div>
            ) : (
              <div className="source-list">
                {sources.slice(0, 6).map((item) => (
                  <article key={item.id} className="source-item">
                    <div className="source-main">
                      <b>{item.title}</b>
                      {item.source_url && (
                        <a href={item.source_url} target="_blank" rel="noreferrer">
                          {item.source_url} <ArrowUpRight size={13} />
                        </a>
                      )}
                    </div>
                    <span className="source-tag">{item.source_type}</span>
                  </article>
                ))}
              </div>
            )}
          </section>
          <section className="card focus-card">
            <p className="eyebrow">YOUR CONTEXT</p>
            <h2>{profile.business_name}</h2>
            <p>{profile.description || 'Add a business description later to sharpen future recommendations.'}</p>
            <div className="evidence">
              <span><BookOpen size={16} /></span>
              <div>
                <b>Private business context</b>
                <small>{profile.marketing_goals.length ? profile.marketing_goals.join(' · ') : 'No marketing goals selected yet'}</small>
              </div>
            </div>
            <button className="dark-button" onClick={openSources}>Open evidence library <ChevronRight size={16} /></button>
          </section>
        </div>
        <section className="card recommendation-card">
          <div className="card-heading">
            <div><p className="eyebrow">PLANNING DRAFT</p><h2>Launch a customer-story content series</h2></div>
            <span className="priority">UNVERIFIED</span>
          </div>
          <p className="recommendation-copy">This is a planning idea, not a market claim. AI recommendations will only receive an evidence label after source collection and validation.</p>
          <div className="recommendation-footer">
            <div className="sources"><span>{saveMessage || 'No evidence attached yet'}</span></div>
            <button className="outline-button" disabled={saving} onClick={() => void saveRecommendation()}>{saving ? 'Saving…' : 'Save draft to plan'}</button>
          </div>
        </section>
      </div>
    </section>
  </main>
}

function Metric({ icon, label, value, suffix, note, tone }: { icon: React.ReactNode; label: string; value: string; suffix: string; note: string; tone: string }) { return <section className="metric"><span className={'metric-icon ' + tone}>{icon}</span><div><p>{label}</p><strong>{value}<small>{suffix}</small></strong><em>{note}</em></div></section> }
createRoot(document.getElementById('root')!).render(<App />)
