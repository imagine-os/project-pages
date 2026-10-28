/* Detail views for the showcase: every tile opens a full view of everything behind it. */
(function () {
  if (!window.React || !window.BetweenGigs) return;
  var R = React, BG = window.BetweenGigs, html = BG.html, I = BG.Icons;
  var useState = R.useState, useEffect = R.useEffect, useRef = R.useRef;
  var data = { tokens: null, pairs: null, comps: null };

  function load(name) {
    return fetch(name).then(function (r) { if (!r.ok) throw new Error(name); return r.json(); });
  }

  /* ---------- helpers ---------- */
  function resolve(tokens, value, theme) {
    var v = typeof value === "string" ? value : (value[theme] || value.light);
    var guard = 0;
    while (v && v.charAt(0) === "{" && guard++ < 16) {
      var name = v.slice(1, -1);
      var t = tokens.color.tokens.find(function (x) { return x.name === name; });
      if (!t) break;
      v = typeof t.value === "string" ? t.value : (t.value[theme] || t.value.light);
    }
    return v;
  }
  function Sec(props) {
    return html`<section className="dv-sec" id=${props.id}>
      <header className="dv-sec-h"><h3>${props.title}</h3>${props.meta && html`<span className="dv-meta">${props.meta}</span>`}</header>
      ${props.lead && html`<p className="dv-lead">${props.lead}</p>`}
      ${props.children}
    </section>`;
  }
  function Swatch(props) {
    return html`<span className="dv-chip" style=${{ background: props.color }} title=${props.color}></span>`;
  }
  function Loading() { return html`<p className="dv-lead">Loading\u2026</p>`; }

  /* ---------- color ---------- */
  function ColorView() {
    var t = data.tokens; if (!t) return html`<${Loading} />`;
    var prims = t.color.tokens.filter(function (x) { return typeof x.value === "string"; });
    var sems = t.color.tokens.filter(function (x) { return typeof x.value !== "string"; });
    var fams = {};
    prims.forEach(function (p) { var k = p.name.split("-")[0]; (fams[k] = fams[k] || []).push(p); });
    return html`<div className="dv-stack">
      <${Sec} title="Primitives" meta=${prims.length + " colors"} lead="The raw palette. Components never use these directly; they use the semantic tokens below.">
        ${Object.keys(fams).map(function (k) {
          return html`<div key=${k} className="dv-ramp">
            <span className="dv-ramp-k">${k}</span>
            <div className="dv-ramp-row">${fams[k].map(function (p) {
              return html`<div key=${p.name} className="dv-step" title=${p.usage}>
                <span className="dv-step-c" style=${{ background: p.value }}></span>
                <span className="dv-mono">${p.name.split("-").slice(1).join("-")}</span>
                <span className="dv-mono dv-sub">${p.value}</span>
              </div>`;
            })}</div>
          </div>`;
        })}
      <//>
      <${Sec} title="Semantic tokens" meta=${sems.length + " tokens \u00b7 light and dark"} lead="Each token is a job. Switching theme swaps the value; the job stays the same.">
        <div className="dv-table-wrap"><table className="dv-table">
          <thead><tr><th>Token</th><th>Light</th><th>Dark</th><th>Use</th></tr></thead>
          <tbody>${sems.map(function (s) {
            var l = resolve(t, s.value, "light"), d = resolve(t, s.value, "dark");
            return html`<tr key=${s.name}>
              <td className="dv-mono dv-strong">${s.name}</td>
              <td><span className="dv-pair"><${Swatch} color=${l} /><span className="dv-mono dv-sub">${l}</span></span></td>
              <td><span className="dv-pair"><${Swatch} color=${d} /><span className="dv-mono dv-sub">${d}</span></span></td>
              <td className="dv-use">${s.usage}</td>
            </tr>`;
          })}</tbody>
        </table></div>
      <//>
    </div>`;
  }

  /* ---------- type ---------- */
  function TypeView() {
    var t = data.tokens; if (!t) return html`<${Loading} />`;
    var fam = t.type.families;
    var total = t.type.groups.reduce(function (n, g) { return n + g.styles.length; }, 0);
    return html`<div className="dv-stack">
      <${Sec} title="Families" meta="4 faces">
        <div className="dv-faces">${Object.keys(fam).map(function (k) {
          return html`<div key=${k} className="dv-face">
            <span className="dv-face-aa" style=${{ fontFamily: "var(--font-" + k + ")", fontStyle: k === "serif" ? "italic" : "normal" }}>Aa Gg 07</span>
            <span className="dv-mono">${k}</span><span className="dv-sub dv-small">${fam[k]}</span>
          </div>`;
        })}</div>
      <//>
      ${t.type.groups.map(function (g) {
        return html`<${Sec} key=${g.name} title=${g.name} meta=${g.styles.length + " of " + total + " styles \u00b7 " + g.family}>
          <div className="dv-type">${g.styles.map(function (s) {
            var f = s.family || g.family;
            return html`<div key=${s.name} className="dv-type-row">
              <div className="dv-type-spec"><span className="dv-mono dv-strong">${s.name}</span>
                <span className="dv-mono dv-sub">${s.fontSize} / ${s.lineHeight} \u00b7 ${s.fontWeight}${s.letterSpacing && s.letterSpacing !== "0em" ? " \u00b7 " + s.letterSpacing : ""}</span>
                <span className="dv-use">${s.usage}</span></div>
              <div className="dv-type-sample" style=${{ fontFamily: "var(--font-" + f + ")", fontSize: s.fontSize, lineHeight: s.lineHeight, fontWeight: s.fontWeight, letterSpacing: s.letterSpacing, textTransform: s.name === "eyebrow" ? "uppercase" : "none", fontStyle: f === "serif" ? "italic" : "normal", color: s.name === "eyebrow" ? "var(--ink-brand)" : "var(--ink)" }}>${s.sample}</div>
            </div>`;
          })}</div>
        <//>`;
      })}
    </div>`;
  }

  /* ---------- scales ---------- */
  function ScaleTable(props) {
    return html`<div className="dv-table-wrap"><table className="dv-table">
      <thead><tr><th>Token</th><th>Value</th><th></th><th>Use</th></tr></thead>
      <tbody>${props.rows.map(function (r) {
        return html`<tr key=${r.name}><td className="dv-mono dv-strong">${r.name}</td><td className="dv-mono dv-sub">${typeof r.value === "string" ? r.value : r.value.light + " / " + r.value.dark}</td><td>${props.visual ? props.visual(r) : null}</td><td className="dv-use">${r.usage}</td></tr>`;
      })}</tbody></table></div>`;
  }
  function ScalesView(props) {
    var t = data.tokens; if (!t) return html`<${Loading} />`;
    var px = function (v) { return parseFloat(v) || 0; };
    var sections = [
      { key: "spacing", title: "Spacing", lead: "4px base. In Tailwind, p-4 is 16px.", visual: function (r) { return html`<span className="dv-bar" style=${{ width: Math.min(px(r.value), 160) + "px" }}></span>`; } },
      { key: "radius", title: "Radius", lead: "Controls 12, cards 16, panels 22. Inner radius = outer minus padding.", visual: function (r) { return html`<span className="dv-rad" style=${{ borderTopRightRadius: r.value }}></span>`; } },
      { key: "shadow", title: "Elevation", lead: "Soft in light theme; in dark theme, surfaces step up and a faint top highlight does the work.", visual: function (r) { return html`<span className="dv-shadow" style=${{ boxShadow: "var(--" + r.name + ")" }}></span>`; } },
      { key: "size", title: "Sizes", lead: "Control heights, icons, avatars and the app shell." },
      { key: "breakpoint", title: "Breakpoints", lead: "Sidebar becomes a drawer below md; the inspector docks at lg." },
      { key: "zIndex", title: "Layers", lead: "A fixed stack order. Nobody writes a raw z-index." },
      { key: "duration", title: "Duration", lead: "Fast for hovers, slower for panels." },
      { key: "easing", title: "Easing", lead: "Four curves.", visual: function (r) { return html`<span className="dv-track"><i style=${{ animationTimingFunction: r.value }}></i></span>`; } },
      { key: "opacity", title: "Opacity", lead: "Disabled state and the material texture limits." },
      { key: "borderWidth", title: "Borders", lead: "Hairlines, strong outlines and the focus ring." },
    ];
    var order = props.focus ? sections.slice().sort(function (a, b) { return (b.key === props.focus) - (a.key === props.focus); }) : sections;
    return html`<div className="dv-stack">${order.map(function (s) {
      var rows = t[s.key] && t[s.key].tokens; if (!rows) return null;
      return html`<${Sec} key=${s.key} title=${s.title} meta=${rows.length + " tokens"} lead=${s.lead}><${ScaleTable} rows=${rows} visual=${s.visual} /><//>`;
    })}</div>`;
  }

  /* ---------- accessibility ---------- */
  function A11yView() {
    var f = useState("all"), filter = f[0], setFilter = f[1];
    var p = data.pairs; if (!p) return html`<${Loading} />`;
    var rows = p.filter(function (x) { return filter === "all" || x.theme === filter; });
    var pass = p.filter(function (x) { return x.ratio >= x.min; }).length;
    return html`<div className="dv-stack">
      <${Sec} title=${pass + " of " + p.length + " pairs pass"} meta="WCAG 2.1 AA" lead="Text needs 4.5:1 against its ground. Borders, focus rings, logo marks and category colors need 3:1. Every pair is checked in both themes.">
        <${BG.SegmentedControl} label="Theme" size="sm" value=${filter} onChange=${setFilter} options=${[{ value: "all", label: "Both themes" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />
        <div className="dv-pairs">${rows.map(function (x, i) {
          return html`<div key=${i} className="dv-pr">
            <span className="dv-pr-demo" style=${{ background: x.bgv, color: x.fgv, borderColor: x.min === 3 ? x.fgv : "transparent" }}>Aa</span>
            <span className="dv-pr-txt"><span className="dv-mono dv-strong">${x.fg}</span><span className="dv-mono dv-sub">on ${x.bg} \u00b7 ${x.theme}</span></span>
            <span className="dv-pr-r"><b>${x.ratio.toFixed(2)}</b><span className="dv-sub">\u2265 ${x.min}</span></span>
          </div>`;
        })}</div>
      <//>
    </div>`;
  }

  /* ---------- themes ---------- */
  function Kit() {
    return html`<div className="dv-kit">
      <${BG.PageHeader} eyebrow="People & knowledge" title="Profile review" description="Peter and Patti approve every profile." />
      <div className="dv-row"><${BG.Button} variant="primary">Claim a card<//><${BG.Button} variant="strong">Approve profile<//><${BG.Button} variant="secondary">Export<//></div>
      <div className="dv-row"><${BG.StatusBadge} status="needs-review" /><${BG.StatusBadge} status="approved" /><${BG.StatusBadge} status="preview" /><${BG.StatusBadge} status="not-started" /></div>
      <${BG.Field} label="ZIP code" error="Enter a 5-digit ZIP code, like 90026."><${BG.Input} defaultValue="9002" /><//>
      <${BG.Banner} tone="info" title="Design stays locked">Text edits only.<//>
      <${BG.Progress} value=${55} label="Building" valueText="55% est." />
    </div>`;
  }
  function ThemesView() {
    return html`<div className="dv-stack">
      <${Sec} title="Same components, two themes" lead="Nothing in the components changes between these panels. Only the theme attribute on the panel does.">
        <div className="dv-themes">
          <div data-theme="light" className="dv-theme"><span className="dv-mono dv-sub">data-theme="light"</span><${Kit} /></div>
          <div data-theme="dark" className="dv-theme"><span className="dv-mono dv-sub">data-theme="dark"</span><${Kit} /></div>
        </div>
      <//>
      <${Sec} title="Brand bands are dark islands" lead="Any section on the brand forest sets the dark theme on itself, so its text and buttons read correctly even when the page around it is light.">
        <div data-theme="dark" className="dv-island">
          <${BG.Logo} height=${32} />
          <span className="dv-island-h">Your craft. <em>More possibilities.</em></span>
          <div className="dv-row"><${BG.Button} variant="primary">Claim a founding card<//><${BG.Button} variant="secondary">How it works<//></div>
        </div>
      <//>
    </div>`;
  }

  /* ---------- components ---------- */
  var families = ["All", "Actions", "Forms", "Display", "Feedback", "Navigation", "Overlays", "Data", "Patterns", "Layout", "Brand", "Motion", "Templates"];
  function ModalDemo() {
    var o = useState(false);
    return html`<div><${BG.Button} variant="primary" onClick=${function () { o[1](true); }}>Open the claim dialog<//>
      <${BG.Modal} open=${o[0]} onClose=${function () { o[1](false); }} title="Claim founding card No. 07" description="Your $250 gift card arrives once your first booking is confirmed."
        footer=${html`<${BG.Button} variant="ghost" onClick=${function () { o[1](false); }}>Cancel<//><${BG.Button} variant="primary" onClick=${function () { o[1](false); }}>Reserve card 07<//>`}>
        <div className="dv-col"><${BG.Field} label="Name"><${BG.Input} /><//><${BG.Checkbox} label="Add me to the Founding Members wall" /></div>
      <//></div>`;
  }
  function ToastDemo() {
    var show = BG.useToast();
    return html`<div className="dv-col">
      <${BG.Toast} message="Changes saved" tone="success" />
      <${BG.Toast} message="Material change undone." action=${{ label: "Redo", onClick: function () {} }} />
      <div><${BG.Button} variant="secondary" onClick=${function () { show({ message: "Profile approved", tone: "success", action: { label: "Undo", onClick: function () {} } }); }}>Show a live toast<//></div>
    </div>`;
  }
  function Stateful(props) { var s = useState(props.init); return props.render(s[0], s[1]); }
  var open = html`<${BG.Button} size="sm" variant="secondary" fullWidth iconEnd=${html`<${I.ArrowUpRight}/>`}>Open<//>`;
  var demos = {
    Button: function () { return html`<div className="dv-col">
      <div className="dv-row">${["primary", "strong", "secondary", "ghost", "danger"].map(function (v) { return html`<${BG.Button} key=${v} variant=${v}>${v.charAt(0).toUpperCase() + v.slice(1)}<//>`; })}</div>
      <div className="dv-row"><${BG.Button} variant="primary" size="lg">Large<//><${BG.Button} variant="primary">Medium<//><${BG.Button} variant="primary" size="sm">Small<//><${BG.Button} variant="primary" loading>Saving<//><${BG.Button} variant="primary" disabled>Disabled<//></div>
      <div className="dv-row"><${BG.Button} variant="secondary" iconStart=${html`<${I.Download}/>`}>Export<//><${BG.Button} variant="primary" iconEnd=${html`<${I.ArrowUpRight}/>`}>Claim a card<//></div></div>`; },
    IconButton: function () { return html`<div className="dv-row"><${BG.IconButton} label="Search" icon=${html`<${I.Search}/>`} /><${BG.IconButton} label="Notifications" icon=${html`<${I.Bell}/>`} /><${BG.IconButton} label="More" variant="secondary" icon=${html`<${I.MoreHorizontal}/>`} /><${BG.IconButton} label="Grid" size="sm" pressed icon=${html`<${I.LayoutGrid}/>`} /><${BG.IconButton} label="Add" variant="primary" icon=${html`<${I.Plus}/>`} /></div>`; },
    SegmentedControl: function () { return html`<${Stateful} init="coverflow" render=${function (v, set) { return html`<${BG.SegmentedControl} label="View" value=${v} onChange=${set} options=${[{ value: "gallery", label: "Gallery", icon: html`<${I.LayoutGrid}/>` }, { value: "list", label: "List", icon: html`<${I.List}/>` }, { value: "coverflow", label: "Coverflow", icon: html`<${I.GalleryHorizontal}/>` }]} />`; }} />`; },
    Switch: function () { return html`<${Stateful} init=${true} render=${function (v, set) { return html`<${BG.Switch} checked=${v} onChange=${set} label="Highlight edits" description="Marks text that changed since the approved copy." />`; }} />`; },
    Field: function () { return html`<div className="dv-col dv-narrow"><${BG.Field} label="Name" hint="As clients will see it."><${BG.Input} /><//><${BG.Field} label="ZIP code" error="Enter a 5-digit ZIP code, like 90026."><${BG.Input} defaultValue="9002" /><//></div>`; },
    Input: function () { return html`<div className="dv-col dv-narrow"><${BG.Input} aria-label="Search" placeholder="Find a page, tool or path\u2026" start=${html`<${I.Search}/>`} /><${BG.Input} aria-label="Location" size="lg" defaultValue="Los Angeles, CA" start=${html`<${I.MapPin}/>`} /><${BG.Input} aria-label="Rate" size="sm" defaultValue="45" start=${html`<span>$</span>`} end=${html`<span>/hr</span>`} /><${BG.Input} aria-label="Workspace" defaultValue="Between Gigs" disabled /></div>`; },
    Textarea: function () { return html`<div className="dv-narrow"><${BG.Textarea} aria-label="Hypothesis" rows=${3} maxLength=${280} showCount defaultValue="Can the viewer understand what changed without invented results?" /></div>`; },
    Select: function () { return html`<div className="dv-col dv-narrow"><${BG.Select} aria-label="Service" placeholder="Choose a service" options=${[{ value: "b", label: "Furniture & creative builds" }, { value: "m", label: "Makeup services" }, { value: "h", label: "Hair styling" }]} /><${BG.Select} aria-label="Status" size="sm" defaultValue="all" start=${html`<${I.Filter}/>`} options=${[{ value: "all", label: "All statuses" }, { value: "w", label: "Working" }]} /></div>`; },
    Checkbox: function () { return html`<div className="dv-col"><${BG.Checkbox} defaultChecked label="Add me to the Founding Members wall" description="First name, last initial and neighborhood." /><${BG.Checkbox} label="I'll leave an honest review after my booking" /><${BG.Checkbox} disabled label="Not available for this device" /></div>`; },
    RadioGroup: function () { return html`<${Stateful} init="area" render=${function (v, set) { return html`<${BG.RadioGroup} name="dv-prio" label="Pointer priority" value=${v} onChange=${set} options=${[{ value: "area", label: "Area first", description: "Current area, then company default." }, { value: "mine", label: "My default everywhere" }]} />`; }} />`; },
    Slider: function () { return html`<div className="dv-narrow"><${Stateful} init=${25} render=${function (v, set) { return html`<${BG.Slider} label="Shine" value=${v} onChange=${set} format=${function (x) { return x + "%"; }} />`; }} /></div>`; },
    Badge: function () { return html`<div className="dv-row">${["success", "warning", "danger", "info", "neutral", "brand"].map(function (t) { return html`<${BG.Badge} key=${t} tone=${t}>${t}<//>`; })}<${BG.Badge} tone="info" icon=${html`<${I.Lock}/>`}>Design locked<//></div>`; },
    StatusBadge: function () { return html`<div className="dv-row">${Object.keys(BG.statusMeta).map(function (k) { return html`<${BG.StatusBadge} key=${k} status=${k} />`; })}</div>`; },
    Tag: function () { return html`<${Stateful} init=${["Silver Lake"]} render=${function (v, set) { return html`<div className="dv-row"><${BG.Tag}>Alterations<//><${BG.Tag}>Closet styling<//>${["Silver Lake", "Echo Park", "Los Feliz"].map(function (a) { return html`<${BG.Tag} key=${a} selected=${v.indexOf(a) > -1} onSelect=${function () { set(v.indexOf(a) > -1 ? v.filter(function (x) { return x !== a; }) : v.concat([a])); }}>${a}<//>`; })}<${BG.Tag} onRemove=${function () {}}>Event lighting<//></div>`; }} />`; },
    Count: function () { return html`<div className="dv-row"><span className="dv-inline">All modules <${BG.Count} value=${101} /></span><span className="dv-inline">Notifications <${BG.Count} value=${3} tone="accent" /></span><span className="dv-inline">Inbox <${BG.Count} value=${240} max=${99} tone="accent" /></span></div>`; },
    Avatar: function () { return html`<div className="dv-row"><${BG.Avatar} name="Maya Chen" size="lg" /><${BG.Avatar} name="Peter Lenkov" /><${BG.Avatar} name="Patti" size="sm" /><${BG.Avatar} name="Hoy Wellness Club" shape="square" size="lg" /></div>`; },
    Progress: function () { return html`<div className="dv-col dv-narrow"><${BG.Progress} value=${55} label="Building" valueText="55% est." /><${BG.Progress} value=${6} max=${20} size="md" label="Founding cards claimed" valueText="6 of 20" /></div>`; },
    Card: function () { return html`<div className="dv-grid3"><${BG.Card}><${BG.CardHeader} kicker="Web page" title="Founding 20 landing" description="Card wheel, offer, how it works." aside=${html`<${BG.StatusBadge} status="draft" size="sm" />`} /><//><${BG.Card} variant="flat" stripe="cat-4"><${BG.CardHeader} kicker="Claim form" title="Claim your card" /><//><${BG.Card} selected><${BG.CardHeader} title="Group call \u00b7 screenshare" description="Selected card." /><//></div>`; },
    Stat: function () { return html`<${BG.StatRow}><${BG.Stat} value="20" label="numbered founding cards" /><${BG.Stat} value="$250" label="gift card toward your first booking" /><${BG.Stat} value="$5,000" label="of work for professionals" /><${BG.Stat} value="14" label="drafts" delta=${{ value: "3 this week", direction: "up" }} /><//>`; },
    Logo: function () { return html`<div className="dv-row dv-logos"><${BG.Logo} height=${40} /><${BG.Logo} layout="stacked" height=${110} /><${BG.Logo} layout="mark" height=${32} /></div>`; },
    Banner: function () { return html`<div className="dv-col">${["info", "success", "warning", "danger"].map(function (t) { return html`<${BG.Banner} key=${t} tone=${t} title=${{ info: "Design stays locked", success: "Profile approved", warning: "Draft \u00b7 not public.", danger: "Couldn't save" }[t]}>${{ info: "Text edits only.", success: "It now appears in the gallery.", warning: "Submissions are disabled.", danger: "Your changes are kept on this device." }[t]}<//>`; })}</div>`; },
    Toast: function () { return html`<${BG.ToastProvider}><${ToastDemo} /><//>`; },
    Tooltip: function () { return html`<div className="dv-row dv-tip"><${BG.Tooltip} content="Search  \u2318K" defaultOpen><${BG.IconButton} label="Search" variant="secondary" icon=${html`<${I.Search}/>`} /><//><${BG.Tooltip} content="Share & reconnect"><${BG.IconButton} label="Share" icon=${html`<${I.Share2}/>`} /><//></div>`; },
    Skeleton: function () { return html`<div className="dv-narrow"><${BG.Card} className="dv-col"><${BG.Skeleton} shape="block" /><${BG.Skeleton} /><${BG.Skeleton} className="w-3/4" /><//></div>`; },
    EmptyState: function () { return html`<${BG.EmptyState} icon=${html`<${I.Layers}/>`} title="No studies yet" action=${html`<${BG.Button} variant="primary" iconStart=${html`<${I.Plus}/>`}>New study<//>`}>Studies collect visual tests and evidence for one question.<//>`; },
    Tabs: function () { return html`<${Stateful} init="studies" render=${function (v, set) { return html`<${BG.Tabs} value=${v} onChange=${set}><${BG.TabList} label="Workspace"><${BG.Tab} value="studies" count=${10}>Studies<//><${BG.Tab} value="media">Media lab<//><${BG.Tab} value="profiles" count=${3}>Profiles<//><//><${BG.TabPanel} value="studies"><p className="dv-sub">Visual studies and benchmarks.</p><//><${BG.TabPanel} value="media"><p className="dv-sub">Generated images and recordings.</p><//><${BG.TabPanel} value="profiles"><p className="dv-sub">Sample people and their cards.</p><//><//>`; }} />`; },
    Breadcrumbs: function () { return html`<${BG.Breadcrumbs} items=${[{ label: "Workspace", href: "#", icon: html`<${I.Home}/>` }, { label: "Marketing & growth", href: "#" }, { label: "Campaign Studio" }]} />`; },
    Pager: function () { return html`<${Stateful} init=${1} render=${function (v, set) { return html`<${BG.Pager} page=${v} pageCount=${5} onChange=${set} itemLabel=${["Connected work", "Table Studio", "Feature reminders", "Project management", "Spec Builder"][v - 1]} />`; }} />`; },
    NavItem: function () { return html`<div className="dv-nav"><${BG.NavSection} title="Workspace"><${BG.NavItem} href="#" label="All modules" icon=${html`<${I.Layers}/>`} count=${101} active /><${BG.NavItem} href="#" label="Projects & planning" icon=${html`<${I.FolderKanban}/>`} count=${5} /><${BG.NavItem} href="#" label="People & knowledge" icon=${html`<${I.Users}/>`} count=${12} /><//></div>`; },
    Stepper: function () { return html`<${Stateful} init=${1} render=${function (v, set) { return html`<div className="dv-narrow"><${BG.Stepper} steps=${["Details", "Skills", "Availability", "Preview"]} current=${v} onStepClick=${set} /></div>`; }} />`; },
    Menu: function () { return html`<div className="dv-menu"><${BG.Menu} trigger=${html`<${BG.Button} variant="secondary" iconStart=${html`<${I.Building2}/>`}>Your companies<//>`} items=${[{ heading: "Workspaces" }, { label: "Between Gigs", description: "Hub linked \u00b7 v3.64", checked: true }, { label: "Sergio's Campus", description: "Profile only", checked: false }, "separator", { label: "Workspace settings", icon: html`<${I.Settings}/>`, shortcut: "\u2318," }, { label: "Leave workspace", icon: html`<${I.LogOut}/>`, danger: true }]} /><span className="dv-sub">Click to open. Arrow keys move, Escape closes.</span></div>`; },
    Modal: function () { return html`<${ModalDemo} />`; },
    Table: function () { return html`<${BG.Table} caption="Profiles in review" rowKey=${function (r) { return r.id; }} selectedKey="1" onRowClick=${function () {}} rows=${[{ id: "1", name: "Maya Chen", role: "Set carpenter", status: "needs-review", rate: 45 }, { id: "2", name: "Luis Ortega", role: "Custom furniture", status: "approved", rate: 55 }, { id: "3", name: "Ren\u00e9e Duval", role: "Events", status: "changes-requested", rate: 60 }]} columns=${[{ key: "name", header: "Professional", cell: function (r) { return html`<span className="dv-inline"><${BG.Avatar} name=${r.name} size="sm" />${r.name}</span>`; } }, { key: "role", header: "Role" }, { key: "status", header: "Status", cell: function (r) { return html`<${BG.StatusBadge} status=${r.status} size="sm" />`; } }, { key: "rate", header: "From", numeric: true, cell: function (r) { return "$" + r.rate + "/hr"; } }]} />`; },
    PageHeader: function () { return html`<${BG.PageHeader} breadcrumbs=${html`<${BG.Breadcrumbs} items=${[{ label: "Workspace", href: "#" }, { label: "Campaign Studio" }]} />`} eyebrow="Marketing & growth" title="Campaign Studio" meta="1.1" description="Turn useful knowledge into a repeatable content practice." actions=${html`<${BG.Button} variant="secondary">Export<//><${BG.Button} variant="primary">Save changes<//>`} />`; },
    ModuleCard: function () { return html`<div className="dv-row dv-top"><${BG.ModuleCard} title="Connected work" status="preview" version="v3.46" action=${open} progress=${{ value: 55, label: "Building" }} selected /><${BG.ModuleCard} title="Spec Builder" status="not-started" progress=${{ value: 0, label: "Planned" }} /></div>`; },
    WorkspaceTile: function () { return html`<div className="dv-grid3"><${BG.WorkspaceTile} name="Hospital Designer" kind="To organize" status="Awaiting hub link" color="cat-2" href="#" /><${BG.WorkspaceTile} name="Karol G" kind="Prospect" status="Profile only" color="cat-5" href="#" /><${BG.WorkspaceTile} name="Loraine Healing Arts" kind="Client" status="Hub linked \u00b7 3 projects" color="cat-3" href="#" /></div>`; },
    FunnelStepCard: function () { return html`<div className="dv-row dv-top"><${BG.FunnelStepCard} type="page" step=${3} status="draft" title="Founding 20 landing" description="Card wheel, offer \u2192 Claim" hint="Double-click to open draft" selected /><${BG.FunnelStepCard} type="email" step=${5} status="draft" title="Your card is reserved" description="Card number \u2192 booking" /></div>`; },
    FlowConnector: function () { return html`<div className="dv-flow"><${BG.Card} padding="sm">Claim your card<//><${BG.FlowConnector} label="Submits" /><${BG.Card} padding="sm">Card reserved<//><${BG.FlowConnector} label="Books" variant="dashed" /><${BG.Card} padding="sm">Booking<//></div>`; },
    ProfileCard: function () { return html`<${BG.ProfileCard} sample name="Jordan Ellis" specialty="Props & custom builds" summary="Practical builds, furniture fixes and one-of-a-kind details made with care." tags=${["Furniture repair", "Custom projects"]} location="Echo Park \u00b7 4 miles away" availability="Available next week" rate=${55} action=${html`<${BG.Button} size="sm" variant="secondary">View profile<//>`} />`; },
    StageStats: function () { return html`<${BG.StageStats} title="Stage statistics" stages=${[{ label: "Invited", value: 120 }, { label: "Signed in", value: 64 }, { label: "Draft", value: 31 }, { label: "Submitted", value: 12, attention: true }, { label: "Changes requested", value: 4 }, { label: "Approved", value: 18 }, { label: "In gallery", value: null }]} />`; },
    FilterBar: function () { return html`<${BG.FilterBar} end=${html`<${BG.Button} size="sm" variant="ghost">Reset filters<//>`}><${BG.Input} size="sm" aria-label="Find" placeholder="Find a page, tool or path\u2026" start=${html`<${I.Search}/>`} className="min-w-48 flex-1" /><${BG.Select} size="sm" aria-label="Status" defaultValue="all" options=${[{ value: "all", label: "All" }]} className="w-32" /><//>`; },
    Drawer: function () { return html`<${Stateful} init=${null} render=${function (v, set) { return html`<div className="dv-row"><${BG.Button} variant="secondary" onClick=${function () { set("left"); }}>Navigation drawer<//><${BG.Button} variant="secondary" onClick=${function () { set("right"); }}>Settings drawer<//><${BG.Drawer} open=${v !== null} side=${v || "right"} onClose=${function () { set(null); }} title=${v === "left" ? "Workspace" : "Thread setup"}><p className="dv-sub">Focus stays inside; Escape closes.</p><//></div>`; }} />`; },
    Popover: function () { return html`<div className="dv-menu" style=${{ minHeight: "220px" }}><${BG.Popover} label="Appearance" title="Appearance" trigger=${html`<${BG.Button} variant="secondary" iconStart=${html`<${I.Sun}/>`}>Appearance<//>`}><${Stateful} init="system" render=${function (v, set) { return html`<${BG.SegmentedControl} label="Theme" size="sm" value=${v} onChange=${set} options=${[{ value: "system", label: "System" }, { value: "light", label: "Light" }, { value: "dark", label: "Dark" }]} />`; }} /><${Stateful} init=${true} render=${function (v, set) { return html`<${BG.Switch} checked=${v} onChange=${set} label="Materials" />`; }} /><//><span className="dv-sub">Click to open. Escape or a click outside closes.</span></div>`; },
    Accordion: function () { return html`<div className="dv-narrow"><${BG.Accordion} defaultOpen=${["setup"]} items=${[{ id: "setup", title: "Thread setup", meta: "Personal notes", content: "Drafts save to your personal notes until you share them." }, { id: "labels", title: "Suggested labels", meta: "3", content: "Hub, Feature, Needs review." }, { id: "history", title: "Writing history", meta: "12 checkpoints", content: "Every save keeps a checkpoint." }]} /></div>`; },
    Combobox: function () { var cs = ["Between Gigs", "Sergio's Campus", "Hoy Wellness Club", "Santa Maria Tennis Club", "Tennis Shop", "Campus Caf\u00e9"]; return html`<div className="dv-narrow" style=${{ minHeight: "300px" }}><${Stateful} init="Between Gigs" render=${function (v, set) { return html`<${BG.Field} label="Company"><${BG.Combobox} value=${v} onChange=${set} placeholder="Find a company\u2026" options=${cs.map(function (c, i) { return { value: c, label: c, description: i === 0 ? "Hub linked" : "Profile only", icon: html`<${BG.Avatar} name=${c} shape="square" size="sm" />` }; })} /><//>`; }} /></div>`; },
    CommandPalette: function () { return html`<${Stateful} init=${false} render=${function (v, set) { return html`<div className="dv-row"><${BG.Button} variant="secondary" iconStart=${html`<${I.Search}/>`} onClick=${function () { set(true); }}>Search everything<//><${BG.Kbd} keys=${["\u2318", "K"]} /><${BG.CommandPalette} open=${v} onClose=${function () { set(false); }} commands=${[{ id: "1", group: "Modules", label: "Funnel Studio", icon: html`<${I.Filter}/>`, onRun: function () {} }, { id: "2", group: "Modules", label: "Profile review", icon: html`<${I.Users}/>`, onRun: function () {} }, { id: "3", group: "Actions", label: "New module", icon: html`<${I.Plus}/>`, shortcut: ["\u2318", "N"], onRun: function () {} }]} /></div>`; }} />`; },
    ConfirmDialog: function () { return html`<${Stateful} init=${false} render=${function (v, set) { return html`<div><${BG.Button} variant="danger" iconStart=${html`<${I.Trash2}/>`} onClick=${function () { set(true); }}>Remove from gallery<//><${BG.ConfirmDialog} open=${v} onCancel=${function () { set(false); }} onConfirm=${function () { set(false); }} title="Remove Maya Chen from the gallery?" description="Her profile goes back to draft. She can resubmit." confirmLabel="Remove profile" /></div>`; }} />`; },
    AvatarGroup: function () { return html`<${BG.AvatarGroup} people=${["Peter Lenkov", "Patti", "Justin Massion", "Maya Chen", "Luis Ortega", "Ren\u00e9e Duval"].map(function (n) { return { name: n }; })} />`; },
    ThemeToggle: function () { return html`<div className="dv-row"><${BG.ThemeToggle} /><${BG.ThemeToggle} size="sm" /><${BG.ThemeToggle} size="sm" showLabel=${false} /></div>`; },
    PageTransition: function () { return html`<p className="dv-lead">Live in the Motion section of the showcase: pick an effect, then switch pages.</p>`; },
    Reveal: function () { return html`<div className="mx-reveals">${BG.revealEffects.map(function (f, i) { return html`<${BG.Reveal} key=${f} effect=${f} delay=${i * 70} repeat=${true} className="mx-rv">${f}<//>`; })}</div>`; },
    ScrollProgress: function () { return html`<p className="dv-lead">The mint bar pinned to the top of the showcase page is ScrollProgress.</p>`; },
    Parallax: function () { return html`<p className="dv-lead">The large BG mark behind the hero drifts with Parallax as you scroll.</p>`; },
    ComingSoon: function () { return html`<p className="dv-lead">See section 05 \u00b7 Templates, and Open full page.</p>`; },
    Kbd: function () { return html`<div className="dv-row"><span className="dv-inline">Search <${BG.Kbd} keys=${["\u2318", "K"]} /></span><span className="dv-inline">Undo <${BG.Kbd} keys=${["\u2318", "Z"]} /></span><span className="dv-inline">Close <${BG.Kbd} keys=${["Esc"]} /></span></div>`; },
    AppShell: function () { return html`<p className="dv-sub">The frame of every signed-in screen: top bar, module bar, sidebar, page, inspector and the floating prompt bar. The sidebar and inspector become drawers on smaller screens.</p>`; },
  };
  function ComponentsView(props) {
    var f = useState(props.focus || "All"), fam = f[0], setFam = f[1];
    var c = data.comps; if (!c) return html`<${Loading} />`;
    var shown = c.filter(function (x) { return fam === "All" || x.group === fam; });
    return html`<div className="dv-stack">
      <div className="dv-filters" role="group" aria-label="Component families">${families.map(function (k) {
        var n = k === "All" ? c.length : c.filter(function (x) { return x.group === k; }).length;
        return html`<${BG.Tag} key=${k} selected=${fam === k} onSelect=${function () { setFam(k); }}>${k} ${n}<//>`;
      })}</div>
      ${shown.map(function (x) {
        var d = demos[x.name];
        return html`<${Sec} key=${x.name} id=${"c-" + x.name} title=${x.name} meta=${x.group + (x.level ? " \u00b7 " + x.level : "")} lead=${x.summary}>
          <div className="dv-demo">${d ? d() : null}</div>
        <//>`;
      })}
    </div>`;
  }

  /* ---------- materials, logo, box ---------- */
  var RARE = [
    ["nd", "60", "144.24", "Nd", "Neodymium", "Brushed magnet steel with the lilac sheen of its salts."],
    ["eu", "63", "151.96", "Eu", "Europium", "Phosphor grain. Charges by day, glows by night."],
    ["di", "59 \u00b7 60", "Pr \u00b7 Nd", "Di", "Didymium glass", "Dichroic lilac to sea green."],
    ["ho", "67", "164.93", "Ho", "Holmium", "Sand in daylight, rose under night light, like the oxide."]
  ];
  function MaterialsView() {
    return html`<div className="dv-stack"><${Sec} title="Personal finish" lead="Materials sit on top of the theme as an optional layer. Every screen looks finished with them off, and that flat version is the default for new people, screenshots and anything a client sees.">
      <div className="mats dv-mats"><div className="mat m-glass">Frosted glass</div><div className="mat m-oak">Lacquered oak</div><div className="mat m-felt">Pressed felt</div></div>
      <ul className="dv-list">
        <li>A material decorates a surface; it never changes the surface's color token.</li>
        <li>Texture strength: 16% on panels, 8% under dense UI, never above 28%.</li>
        <li>Inputs, tables, menus, modals and toasts never take a material, so text never sits on a texture.</li>
        <li>Only the shell (sidebar, top bar, prompt bar) and large panels take materials.</li>
        <li>Brand sections, embedded previews and public pages stay flat.</li>
        <li>Shine and lighting turn off under reduced motion or reduced transparency.</li>
      </ul><//>
      <${Sec} title="Rare-earth collection" meta="material-neodymium \u00b7 europium \u00b7 didymium \u00b7 holmium" lead="Four procedural finishes drawn entirely in CSS, with no image files. In the product they run through the same material layer at panel strength; here they are shown at full strength.">
        <div className="re-grid">${RARE.map(function (r) {
          return html`<div key=${r[0]} className=${"re re-" + r[0]}><span className="re-base"></span><span className="re-top"><span>${r[1]}</span><span>${r[2]}</span></span><span className="re-sym">${r[3]}</span><div><div className="re-name">${r[4]}</div><div className="re-note">${r[5]}</div></div></div>`;
        })}</div>
        <ul className="dv-list">
          <li>Use them like any material: <code>class="material material-holmium"</code> on the shell or a large panel.</li>
          <li>Holmium and Europium respond to the theme: Holmium shifts from sand to rose, Europium glows only in dark.</li>
          <li>Same rules as every material: never behind text, inputs or anything that carries state, and off under reduced transparency.</li>
        </ul>
      <//></div>`;
  }
  function LogoView() {
    var lock = function (layout, h) { return html`<${BG.Logo} layout=${layout} height=${h} />`; };
    return html`<div className="dv-stack">
      <${Sec} title="Lockups" meta="wide \u00b7 stacked \u00b7 mark" lead="The component draws the approved paths and takes each file's exact inks for the theme it sits in.">
        <div className="dv-themes">
          <div data-theme="light" className="dv-theme dv-logo">${lock("wide", 56)}<div className="dv-row dv-logos">${lock("stacked", 140)}${lock("mark", 40)}</div></div>
          <div data-theme="dark" className="dv-theme dv-logo" style=${{ background: "var(--surface-brand)" }}>${lock("wide", 56)}<div className="dv-row dv-logos">${lock("stacked", 140)}${lock("mark", 40)}</div></div>
        </div>
      <//>
      <${Sec} title="Rules">
        <ul className="dv-list">
          <li>Wide for headers and nav; stacked for covers, sign-in and square spaces; the monogram alone for the top bar, rail and favicon.</li>
          <li>Inks: monogram and "Gigs" #012B18 on light, #03FF96 on dark; "Between" #012B18 / #F5FFF8; divider #799184 / #8DAA99.</li>
          <li>Clear space of at least half the monogram's height on every side.</li>
          <li>Minimum sizes: wide 24px tall, monogram 20px, stacked 64px.</li>
          <li>Never recolor, outline, rotate or add effects. On photos or textures, put a solid plate behind it.</li>
        </ul>
      <//>
    </div>`;
  }
  function BoxView() {
    var rows = [
      ["tokens/", "build-tokens.py is the single source; it writes tokens.json, the Tailwind theme and a 138-pair contrast report."], ["scripts/qa/", "Accessibility audit (axe) and keyboard tests for every component."],
      ["between-gigs.css", "The Tailwind v4 theme. Import it after Tailwind; the defaults are replaced by the brand's."],
      ["src/components/", "51 React components in TypeScript, one file each, no runtime dependency besides React."],
      ["fonts/", "Sora, Figtree, Newsreader and JetBrains Mono as variable woff2 files."],
      ["logos/", "Wide and stacked lockups, on-light and on-dark, as SVG."],
      ["BRAND.md", "The brand book: principles, content rules, color, type, layout, states, accessibility."],
      ["LOGO.md", "Lockups, exact inks, clear space and minimum sizes."],
      ["README.md", "Setup for developers: install, theme switching, rules for code."],
    ];
    return html`<div className="dv-stack"><${Sec} title="In the box" meta=${rows.length + " items"}>
      <div className="dv-table-wrap"><table className="dv-table"><tbody>${rows.map(function (r) { return html`<tr key=${r[0]}><td className="dv-mono dv-strong">${r[0]}</td><td className="dv-use">${r[1]}</td></tr>`; })}</tbody></table></div>
    <//></div>`;
  }

  /* ---------- registry + dialog ---------- */
  var views = {
    color: { title: "Color", sub: "All 93 tokens, light and dark", view: ColorView },
    type: { title: "Typography", sub: "Four families, 19 styles", view: TypeView },
    spacing: { title: "Scales", sub: "Spacing, radius, elevation, motion, layers", view: ScalesView, focus: "spacing" },
    radius: { title: "Scales", sub: "Spacing, radius, elevation, motion, layers", view: ScalesView, focus: "radius" },
    shadow: { title: "Scales", sub: "Spacing, radius, elevation, motion, layers", view: ScalesView, focus: "shadow" },
    easing: { title: "Scales", sub: "Spacing, radius, elevation, motion, layers", view: ScalesView, focus: "easing" },
    a11y: { title: "Accessibility", sub: "Every contrast pair, both themes", view: A11yView },
    themes: { title: "Themes", sub: "Light, dark and brand islands", view: ThemesView },
    materials: { title: "Materials", sub: "The optional personal finish", view: MaterialsView },
    components: { title: "Components", sub: "All of them, running live", view: ComponentsView },
    logo: { title: "Logo", sub: "Lockups and rules", view: LogoView },
    box: { title: "Handover", sub: "Everything in the package", view: BoxView },
  };

  var dlg = document.getElementById("detail");
  var root = ReactDOM.createRoot(document.getElementById("detail-root"));
  var lastTrigger = null;
  function Detail(props) {
    var v = views[props.k];
    var t = useState(0); // re-render once data arrives
    useEffect(function () {
      var need = [];
      if (!data.tokens) need.push(load("tokens.json").then(function (j) { data.tokens = j; }));
      if (!data.pairs) need.push(load("pairs.json").then(function (j) { data.pairs = j; }));
      if (!data.comps) need.push(load("components.json").then(function (j) { data.comps = j; }));
      if (need.length) Promise.all(need).then(function () { t[1](1); }).catch(function () { t[1](2); });
    }, []);
    if (t[0] === 2) return html`<p className="dv-lead">This view couldn't load its data. Reload the page to try again.</p>`;
    return R.createElement(v.view, { focus: props.focus });
  }
  // Shared-element morph: the tile grows into the dialog, and the dialog shrinks back into it on close.
  var still = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function morph(from, to, update) {
    if (!document.startViewTransition || still || !from || !to) { update(); return; }
    from.style.viewTransitionName = "morph";
    var t = document.startViewTransition(function () { from.style.viewTransitionName = ""; update(); to.style.viewTransitionName = "morph"; });
    t.finished.finally(function () { from.style.viewTransitionName = ""; to.style.viewTransitionName = ""; });
  }
  var lastTile = null;
  function openDetail(key, focus, trigger, tile) {
    var v = views[key]; if (!v) return;
    lastTrigger = trigger || null; lastTile = tile || null;
    var show = function () {
      document.getElementById("detail-title").textContent = v.title;
      document.getElementById("detail-sub").textContent = v.sub;
      ReactDOM.flushSync(function () { root.render(R.createElement(Detail, { k: key, focus: focus || v.focus, key: key + (focus || "") })); });
      if (!dlg.open) dlg.showModal();
      document.getElementById("detail-body").scrollTop = 0;
    };
    if (dlg.open) show(); else morph(tile, dlg, show);
  }
  function closeDetail() { if (!dlg.open) return; morph(dlg, lastTile && lastTile.isConnected ? lastTile : null, function () { dlg.close(); }); }
  dlg.addEventListener("close", function () { root.render(null); if (lastTrigger) lastTrigger.focus(); });
  dlg.addEventListener("cancel", function (e) { e.preventDefault(); closeDetail(); });
  dlg.addEventListener("click", function (e) { if (e.target === dlg) closeDetail(); });
  document.getElementById("detail-close").addEventListener("click", closeDetail);

  // Tiles: the "View all" button opens the view; clicks on the tile's quiet areas do too.
  var INTERACTIVE = "button, a, input, select, textarea, label, [role=switch], [role=radio], [role=tab], [role=slider], [role=menu]";
  document.querySelectorAll(".tile[data-detail]").forEach(function (tile) {
    var key = tile.getAttribute("data-detail"), focus = tile.getAttribute("data-focus");
    var lab = tile.querySelector(".label");
    var btn = document.createElement("button");
    btn.type = "button"; btn.className = "more";
    btn.innerHTML = '<span>View all</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
    btn.setAttribute("aria-label", "View all: " + (tile.getAttribute("data-name") || views[key].title));
    btn.setAttribute("aria-haspopup", "dialog");
    btn.addEventListener("click", function (e) { e.stopPropagation(); openDetail(key, focus, btn, tile); });
    (lab || tile).appendChild(btn);
    tile.classList.add("is-link");
    tile.addEventListener("click", function (e) {
      if (e.target.closest(".mount") && e.target.closest(INTERACTIVE)) return;
      if (window.getSelection && String(window.getSelection())) return;
      openDetail(key, focus, btn, tile);
    });
  });
})();
