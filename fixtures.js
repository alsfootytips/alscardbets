// Fixtures: every game of the day with player props (list), and one game's picks + every player's stat graph
// with bet365 prices and EV under each graph (?g=<id>). Shared by all sports; each sport writes
// <sport>_fixtures.json in the format documented in pricer/fixtures.py.
(() => {
const root = document.getElementById("fx");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
const UK = {timeZone: "Europe/London"};
const day = iso => new Date(iso).toLocaleDateString("en-CA", UK);              // YYYY-MM-DD in UK time
const gday = g => g.day || day(g.tip);
const hhmm = iso => new Date(iso).toLocaleTimeString("en-GB", {...UK, hour: "2-digit", minute: "2-digit"});
const img = (src, cls, alt = "") => src ? `<img class="${cls}" src="${esc(src)}" alt="${esc(alt)}" loading=lazy onerror="this.remove()">` : "";
const params = new URLSearchParams(location.search);
let D;

fetch(root.dataset.src + "?v=" + Date.now()).then(r => r.json()).then(d => {
  D = d;
  D.games.sort((a, b) => a.tip < b.tip ? -1 : 1);
  const g = params.get("g") && D.games.find(x => String(x.id) === params.get("g"));
  const top = document.getElementById("fxtop"); if (top && g) top.style.display = "none";
  g ? game(g) : list();
}).catch(err => { console.error(err); root.innerHTML = "<p class=none>No fixtures with player props right now.</p>"; });

// ---------- list ----------
function list() {
  const today = day(new Date().toISOString());
  const days = [...new Set(D.games.map(gday))].sort();
  let sel = params.get("d") || (days.includes(today) ? today : days.find(d => d >= today) || days[days.length - 1]);
  let upcoming = false, q = "";
  const SRX = window.SR || {score: (a, b) => String(b).toLowerCase().includes(String(a).toLowerCase()) ? 1 : 0, aliases: () => []};
  const teamHit = t => t ? SRX.score(q, t.name, [t.abbr || "", ...(t.alias || []), ...SRX.aliases(t.name)]) : 0;
  const hitPlayers = g => q ? (g.players || []).map(p => [p, SRX.score(q, p.name)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]) : [];
  const label = d => {
    const diff = Math.round((new Date(d) - new Date(today)) / 864e5);
    return diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : diff === -1 ? "Yesterday"
      : new Date(d + "T12:00Z").toLocaleDateString("en-GB", {weekday: "long"});
  };
  function draw() {
    // searching looks across every day; otherwise just the selected day
    const gs = D.games.filter(g => (q ? (teamHit(g.home) || teamHit(g.away) || hitPlayers(g).length || SRX.score(q, g.comp || "")) : gday(g) === sel) && (!upcoming || g.status !== "final"));
    const comps = [];
    for (const g of gs) {
      let c = comps.find(c => c.name === (g.comp || D.title));
      if (!c) comps.push(c = {name: g.comp || D.title, logo: g.comp_logo, sub: g.comp_sub || "", games: []});
      c.games.push(g);
    }
    const npk = D.games.filter(g => gday(g) === sel).reduce((a, g) => a + (g.picks || []).length, 0);
    root.innerHTML = `${root.dataset.sub ? "<h2 class=fx-h>Fixtures</h2>" : "<h1>Fixtures</h1>"}<p class=meta>${esc(D.note || "Every game with player props. Open a game for its picks and every player's stats, with bet365 prices and EV under each graph.")}${D.updated ? ` · updated ${hhmm(D.updated)}` : ""}</p>`
      + `<div class=fx-days>${days.map(d => `<button data-d="${d}" class="${d === sel ? "on" : ""}">${label(d)} <span>${D.games.filter(g => gday(g) === d).length}</span></button>`).join("")}</div>`
      + `<div class=fx-tools><input id=fxs type=search placeholder="Search teams or players" autocomplete=off value="${esc(q)}"><button id=fxup class="${upcoming ? "on" : ""}">Upcoming only</button><span class=meta>${gs.length} game${gs.length === 1 ? "" : "s"} · ${npk} pick${npk === 1 ? "" : "s"}</span></div>`
      + (comps.length ? comps.map(c => `<details class=fx-comp open><summary>${img(c.logo, "fx-clogo")}<div><b>${esc(c.name)}</b>${c.sub ? `<small>${esc(c.sub)}</small>` : ""}</div><span class=fx-n>${c.games.length}</span></summary>`
          + c.games.map(row).join("") + `</details>`).join("") : "<p class=none>No games with player props on this day.</p>");
    root.querySelectorAll(".fx-days button").forEach(b => b.onclick = () => { sel = b.dataset.d; history.replaceState(null, "", "?d=" + sel); draw(); });
    root.querySelector("#fxup").onclick = () => { upcoming = !upcoming; draw(); };
    const si = root.querySelector("#fxs");
    si.oninput = () => { q = si.value; draw(); const n = root.querySelector("#fxs"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); };
  }
  const row = g => {
    const right = g.status === "final" || g.status === "live"
      ? `<span class="fx-st ${g.status}">${g.status === "live" ? esc(g.clock || "Live") : "FT"}</span><b class=fx-sc>${esc(g.score || "")}</b>`
      : `<span class=fx-st>${hhmm(g.tip)}</span>`;
    const n = (g.picks || []).length;
    const hp = hitPlayers(g).slice(0, 3).map(x => x[0].name);
    const extra = (q && gday(g) !== sel ? `<small class=fx-when>${new Date(g.tip).toLocaleDateString("en-GB", {...UK, weekday: "short", day: "numeric", month: "short"})}</small>` : "")
      + (hp.length ? `<small class=fx-hp>${hp.map(esc).join(", ")}</small>` : "");
    return `<a class=fx-row href="?g=${encodeURIComponent(g.id)}${q && hp.length ? "&q=" + encodeURIComponent(q) : ""}"><div class=fx-teams>`
      + [g.away, g.home].filter(Boolean).map(t => `<div>${img(t.logo, "fx-tlogo")}<span>${esc(t.name)}</span></div>`).join("")
      + extra + `</div><div class=fx-right>${n ? `<span class=fx-pk>${n} pick${n === 1 ? "" : "s"}</span>` : ""}${g.info ? `<small>${esc(g.info)}</small>` : ""}<div class=fx-time>${right}</div></div><span class=fx-go>›</span></a>`;
  };
  draw();
}

// ---------- one game ----------
const ORDER = {out: 0, suspension: 0, "injured reserve": 0, doubtful: 1, questionable: 2, "day-to-day": 2, "game-time decision": 2, probable: 3};
function injuries(g) {
  const L = (g.injuries || []).slice().sort((a, b) => (ORDER[(a.status || "").toLowerCase()] ?? 2) - (ORDER[(b.status || "").toLowerCase()] ?? 2));
  if (!L.length) return "";
  const cls = s => { s = (s || "").toLowerCase(); return s === "out" || s.includes("reserve") || s.includes("susp") ? "out" : s === "probable" ? "ok" : s === "doubtful" ? "dbt" : "q"; };
  const ret = d => d ? `back ~${new Date(d + "T12:00Z").toLocaleDateString("en-GB", {day: "numeric", month: "short"})}` : "";
  return `<details class="rsec fx-injs" id="inj${esc(g.id)}" open><summary><h2>Injuries</h2><b>${L.length}</b></summary><div class=fx-inj>`
    + L.map(i => { const t = g[i.team] || {};
      return `<${i.link ? `a href="${esc(i.link)}"` : "div"} class="fx-ij ${cls(i.status)}">${img(i.face, "fx-face")}<div><b>${esc(i.name)}</b>`
        + `<small>${img(t.logo, "fx-mini")}${esc(t.abbr || t.name || "")}</small>`
        + `<small class=fx-ijt>${esc(i.type || "Injury")}${i.ret ? ` · ${ret(i.ret)}` : ""}</small></div><span class=fx-ijs>${esc(i.status || "")}</span></${i.link ? "a" : "div"}>`; }).join("")
    + `</div></details>`;
}
function game(g) {
  let ss0 = false; try { ss0 = localStorage.getItem("fxss") === "1"; } catch (e) {}
  const st = {team: "all", market: "best", q: params.get("q") || "", priced: false, ss: ss0};
  // Super Sub (football): a market may carry "vs" = what the player who replaced him added that game, and
  // "rungs_ss" = model/EV with Super Sub. With the toggle on, bars stack that part on top in purple.
  const SS_COL = "#A78BFA";
  const tot = M => st.ss && M.vs ? M.v.map((v, i) => v + (M.vs[i] || 0)) : M.v;
  const RG = M => (st.ss && M.rungs_ss) || M.rungs || [];
  const SRX = window.SR || {score: (a, b) => String(b).toLowerCase().includes(String(a).toLowerCase()) ? 1 : 0};
  const P = g.players || [];
  const hasSS = P.some(p => Object.values(p.m || {}).some(M => (M.vs || []).some(x => x)));
  const markets = [...new Set(P.flatMap(p => Object.keys(p.m || {})))];
  const order = D.markets || markets;
  markets.sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  const isVal = r => r && r[3] >= (D.value_ev ?? 5) && r[1] <= (D.max_odds ?? 15) && r[2] >= (D.min_model ?? 0);
  const cardState = {};
  const when = g.status === "final" ? `FT ${esc(g.score || "")}` : g.status === "live" ? `${esc(g.clock || "Live")} ${esc(g.score || "")}`
    : new Date(g.tip).toLocaleString("en-GB", {...UK, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"});
  const team = side => g[side] ? `<div class=fx-ht>${img(g[side].logo, "fx-hlogo")}<b>${esc(g[side].name)}</b></div>` : "";
  root.innerHTML = `<a class=fx-back href="?d=${gday(g)}">‹ Fixtures</a>`
    + `<div class=fx-head>${team("away")}<div class=fx-mid><b>${when}</b>${g.info ? `<small>${esc(g.info)}</small>` : ""}${g.comp ? `<small>${esc(g.comp)}</small>` : ""}</div>${team("home")}</div>`
    + ((g.notes || []).length ? `<div class=fx-notes>${g.notes.map(n => `<span>${esc(n)}</span>`).join("")}</div>` : "")
    + injuries(g)
    + `<h2>Picks <span>${(g.picks || []).length || "none yet"}</span></h2>`
    + ((g.picks || []).length ? `<div class=fx-picks>${g.picks.map((k, i) => {
        const p = P.find(x => String(x.pid) === String(k.pid)) || {};
        return `<button class=fx-pick data-i="${i}">${img(p.face, "fx-face sm")}<div><b>${esc(k.player)}</b><small>${esc(k.line)} ${esc(k.market)}${k.tag ? ` · ${esc(k.tag)}` : ""}</small></div>`
          + `<div class=c><b>${(+k.odds).toFixed(2)}</b><small>${k.stake ? esc(k.stake) + "u" : ""}</small></div><div class=c><b class=pos>${k.ev > 0 ? "+" : ""}${(+k.ev).toFixed(0)}%</b><small>${(+k.model).toFixed(0)}% model</small></div></button>`;
      }).join("")}</div>` : `<p class=meta>${esc(D.no_picks || "No model picks in this game.")}</p>`)
    + `<h2>Players</h2><div class=fx-ctl><div class=fx-seg>${[["all", "Both"], ["away", g.away?.abbr || g.away?.name || "Away"], ["home", g.home?.abbr || g.home?.name || "Home"]].map(([k, l]) => `<button data-t="${k}" class="${k === st.team ? "on" : ""}">${esc(l)}</button>`).join("")}</div>`
    + `<input id=fxq type=search placeholder="Search players" autocomplete=off><button id=fxpr>Priced only</button><button id=fxview>Show all graphs</button>${hasSS ? `<button id=fxss class="${st.ss ? "on ss" : "ss"}" title="Count what his replacement adds if he is subbed off (bet365 Super Sub)">Super Sub</button>` : ""}</div>`
    + `<p class="meta fx-key">EV colours: <b class=pos>green</b> = value (${D.min_model ? `${D.min_model}%+ model chance and ` : ""}${D.value_ev ?? 5}%+ EV) · <b style="color:#F27A1A">orange</b> = positive EV but a long shot or below the value bar · <b class=neg>red</b> = bet365 price is worse than the model's</p>`
    + `<div class="chips fx-mk"><button data-m="best" class=on>Best value</button>${markets.map(m => `<button data-m="${esc(m)}">${esc(D.short?.[m] || m)}</button>`).join("")}</div>`
    + `<div id=fxcards class=fx-cards></div>`;
  root.querySelectorAll(".fx-seg button").forEach(b => b.onclick = () => { st.team = b.dataset.t; root.querySelectorAll(".fx-seg button").forEach(x => x.classList.toggle("on", x === b)); cards(); });
  root.querySelectorAll(".fx-mk button").forEach(b => b.onclick = () => { st.market = b.dataset.m; root.querySelectorAll(".fx-mk button").forEach(x => x.classList.toggle("on", x === b)); for (const k in cardState) delete cardState[k]; cards(); });
  root.querySelector("#fxq").value = st.q;
  root.querySelector("#fxq").oninput = e => { st.q = e.target.value; cards(); };
  root.querySelector("#fxpr").onclick = e => { st.priced = !st.priced; e.target.classList.toggle("on", st.priced); cards(); };
  const ssb = root.querySelector("#fxss");
  if (ssb) ssb.onclick = () => { st.ss = !st.ss; ssb.classList.toggle("on", st.ss); try { localStorage.setItem("fxss", st.ss ? "1" : "0"); } catch (e) {} for (const k in cardState) cardState[k].k = null; cards(); };
  root.querySelector("#fxview").onclick = e => { st.graphs = !st.graphs; e.target.classList.toggle("on", st.graphs); cards(); };
  root.querySelectorAll(".fx-pick").forEach(b => b.onclick = () => {
    const k = g.picks[+b.dataset.i];
    cardState[k.pid] = {m: k.market, k: parseFloat(k.line)};
    st.q = ""; root.querySelector("#fxq").value = ""; st.team = "all";
    cards();
    const el = document.getElementById("c" + k.pid); if (el && el.parentElement.tagName === "DETAILS") el.parentElement.open = true; if (el) { el.scrollIntoView({behavior: "smooth", block: "center"}); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1500); }
  });

  const pickOf = p => (g.picks || []).find(k => String(k.pid) === String(p.pid) && (p.m || {})[k.market]);
  function pickMarket(p) {
    const ms = Object.keys(p.m || {});
    if (st.market !== "best") return ms.includes(st.market) ? st.market : null;
    const pk = pickOf(p);
    if (pk) { cardState[p.pid] = cardState[p.pid] || {m: pk.market, k: parseFloat(pk.line)}; return pk.market; }
    let best = null;
    for (const m of ms) for (const r of RG(p.m[m])) if (isVal(r) && (!best || r[3] > best.ev)) best = {m, ev: r[3]};
    if (best) return best.m;
    return ms.find(m => RG(p.m[m]).length) || ms[0];
  }
  function defLine(M) {
    const rs = RG(M);
    const v = rs.filter(isVal).sort((a, b) => b[3] - a[3])[0];
    if (v) return v[0];
    const tv = tot(M), pr = M.proj ?? (tv.length ? tv.reduce((a, b) => a + b, 0) / tv.length : 1);
    if (rs.length) return rs.reduce((a, b) => Math.abs(lineAt(M, b[0]) - pr) < Math.abs(lineAt(M, a[0]) - pr) ? b : a)[0];
    return M.under ? Math.round(pr) + 0.5 : Math.max(1, Math.round(pr));
  }
  const lineAt = (M, k) => M.under ? k : k - 0.5;
  const hitOf = (M, v, k) => M.under ? v < k : v >= k;
  const kLabel = (M, k) => M.under ? `U ${k}` : `${k}+`;

  function cards() {
    const box = document.getElementById("fxcards");
    const qs = p => st.q ? SRX.score(st.q, p.name) : 1;
    let ps = P.filter(p => (st.team === "all" || p.team === st.team) && qs(p) > 0);
    ps = ps.map(p => ({p, m: (cardState[p.pid] || {}).m || pickMarket(p)})).filter(x => x.m && x.p.m[x.m]);
    if (st.priced) ps = ps.filter(x => RG(x.p.m[x.m]).length);
    // most EV first, on the line each card shows (unpriced players last)
    for (const x of ps) { const s = cardState[x.p.pid] = cardState[x.p.pid] || {m: x.m}; if (s.m !== x.m) { s.m = x.m; s.k = null; } if (s.k == null) s.k = defLine(x.p.m[x.m]); }
    const curEv = x => { const r = RG(x.p.m[x.m]).find(r => r[0] === cardState[x.p.pid].k); return r ? r[3] : -999; };
    ps.sort((a, b) => (st.q ? qs(b.p) - qs(a.p) : 0) || (curEv(b) - curEv(a)) || ((b.p.sort || 0) - (a.p.sort || 0)));
    box.className = st.graphs ? "fx-cards" : "fx-list";
    box.innerHTML = ps.length ? ps.map(x => st.graphs ? card(x.p, x.m)
      : `<details class=fx-li><summary id="s${esc(x.p.pid)}"></summary>${card(x.p, x.m)}</details>`).join("") : "<p class=none>No players match.</p>";
    for (const x of ps) wire(x.p);
    box.querySelectorAll("details.fx-li").forEach(d => d.addEventListener("toggle", () => d.querySelector(".fx-card").classList.toggle("open", d.open)));
  }
  function card(p, m) {
    const s = cardState[p.pid] = cardState[p.pid] || {m};
    s.m = m; const M = p.m[m];
    if (s.k == null) s.k = defLine(M);
    const ms = Object.keys(p.m);
    const tm = g[p.team] || {};
    return `<div class=fx-card id="c${esc(p.pid)}"><div class=fx-ch>${img(p.face, "fx-face")}<div class=fx-who>`
      + `${p.link ? `<a href="${esc(p.link)}"><b>${esc(p.name)}</b></a>` : `<b>${esc(p.name)}</b>`}<small>${img(tm.logo, "fx-mini")}${esc(tm.abbr || tm.name || "")}${p.pos ? " · " + esc(p.pos) : ""}${p.tag ? ` <span class="fx-tag ${esc(p.tag_cls || "")}">${esc(p.tag)}</span>` : ""}</small></div></div>`
      + (ms.length > 1 ? `<select class=fx-sel aria-label="Market">${ms.map(x => `<option${x === m ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>` : `<div class=fx-one>${esc(m)}</div>`)
      + `<div class=fx-body><div class=fx-left><div class=fx-chart></div><div class=fx-ctl2></div></div>`
      + `<div class=fx-right><div class=fx-sum></div><div class=fx-rt></div><div class=fx-hr></div></div></div></div>`;
  }
  function wire(p) {
    const el = document.getElementById("c" + p.pid); if (!el) return;
    const sel = el.querySelector(".fx-sel");
    if (sel) sel.onchange = () => { const s = cardState[p.pid]; s.m = sel.value; s.k = defLine(p.m[s.m]); draw(p); };
    draw(p);
  }
  function draw(p) {
    const el = document.getElementById("c" + p.pid), s = cardState[p.pid], M = p.m[s.m];
    if (s.k == null) s.k = defLine(M);
    const k = s.k, G = p.g || [], n = Math.min(M.v.length, s.n || D.last_n || 15);
    const wide = !!el.closest("details.fx-li");                 // opened row: wider, shorter chart
    if (s.proj == null) s.proj = true;
    const vals = tot(M).slice(-n), gs = G.slice(-n), subs = st.ss && M.vs ? M.vs.slice(-n) : null;
    const proj = s.proj ? M.proj : null;
    // NBA-style chart: newest on the left after a dashed "next" bar, minutes line on a right-hand scale
    const W = wide ? 560 : 340, H = wide ? 230 : 196, pad = 24, padR = 14, cols = n + (proj != null ? 1 : 0), bw = (W - pad - padR) / Math.max(cols, 1), gap = Math.min(4, bw * .25);
    const base = H - 32, topY = 10;
    const mx = Math.max(lineAt(M, k) * 1.3, (proj || 0) * 1.1, ...vals, 1);
    const y = v => base - (base - topY) * v / mx;
    const mMax = D.min_max || 0, hasMin = mMax && gs.some(r => r[3] != null);
    const ym = v => base - (base - topY) * Math.min(v, mMax) / mMax;
    const every = Math.ceil(cols / 6);
    let bars = "", pts = [], labels = "";
    const off = proj != null ? 1 : 0;
    for (let j = 0; j < n; j++) {
      const i = n - 1 - j, v = vals[i], r = gs[i] || [], x = pad + (j + off) * bw + gap / 2, w = bw - gap, cx = x + w / 2;
      const ok = hitOf(M, v, k), sb = subs ? (subs[i] || 0) : 0;
      if (sb) bars += `<rect x="${x}" y="${y(v)}" width="${w}" height="${Math.max(1, y(v - sb) - y(v))}" fill="${SS_COL}"><title>Super Sub: +${sb} from his replacement</title></rect>`;
      bars += `<rect x="${x}" y="${y(v - sb)}" width="${w}" height="${Math.max(1, base - y(v - sb))}" rx="${Math.min(3, w / 3)}" fill="${ok ? "#4ADE80" : "#F87171"}" opacity="${r[4] === 0 ? .5 : .95}"><title>${esc(r[0] || "")} v ${esc(r[1] || "")}: ${v}${r[3] != null ? ` in ${r[3]} min` : ""}${r[4] === 0 ? " (bench)" : ""}</title></rect>`
        + (bw >= 13 ? (base - y(v) >= 14 ? `<text x="${cx}" y="${y(v) + 10}" text-anchor=middle font-size=9 font-weight=600 fill="#000" opacity=".7">${v}</text>` : `<text x="${cx}" y="${y(v) - 3}" text-anchor=middle font-size=9 fill="#F5F5F5">${v}</text>`) : "");
      if (hasMin && r[3] != null) pts.push(`${cx.toFixed(1)},${ym(r[3]).toFixed(1)}`);
      const ls = Math.min(12, w);
      if (r[2]) labels += `<image href="${esc(r[2])}" x="${cx - ls / 2}" y="${base + 4}" width="${ls}" height="${ls}"><title>v ${esc(r[1] || "")}</title></image>`;
      else if (r[1] && bw >= 16) labels += `<text x="${cx}" y="${base + 12}" text-anchor=middle font-size=6.5 fill="#9A9A9A">${esc(String(r[1]).slice(0, 4))}</text>`;
      if ((j + off) % every === 0 && r[0]) { const [mm, dd] = r[0].split("-").slice(-2); labels += `<text x="${cx}" y="${H - 3}" text-anchor=middle font-size=7.5 fill="#9A9A9A">${+dd}/${+mm}</text>`; }
    }
    let next = "";
    if (proj != null) {
      const x = pad + gap / 2, w = bw - gap, cx = x + w / 2;
      next = `<rect x="${x}" y="${y(proj)}" width="${w}" height="${Math.max(1, base - y(proj))}" rx="${Math.min(3, w / 3)}" fill=none stroke="#F5F5F5" stroke-dasharray="3 2" opacity=".7"><title>Next: projection ${(+proj).toFixed(1)}</title></rect>`
        + (hasMin && p.exp_min != null ? `<circle cx="${cx}" cy="${ym(p.exp_min)}" r="2.4" fill="#000" stroke="#60A5FA" stroke-width="1.1"><title>Expected ${p.exp_min} min</title></circle>` : "")
        + `<text x="${cx}" y="${H - 3}" text-anchor=middle font-size=7.5 fill="#F27A1A">Next</text>`;
      if (hasMin && p.exp_min != null) pts.unshift(`${cx.toFixed(1)},${ym(p.exp_min).toFixed(1)}`);
    }
    const mins = hasMin && pts.length > 1 ? `<polyline points="${pts.join(" ")}" fill=none stroke="#60A5FA" stroke-width="1" opacity=".7"/>` : "";
    const rung = RG(M).find(r => r[0] === k);
    const col = rung ? (isVal(rung) ? "#4ADE80" : rung[3] < 0 ? "#F87171" : "#F27A1A") : "#F27A1A";
    const ly = y(lineAt(M, k));
    el.querySelector(".fx-chart").innerHTML = `<div class=fx-lt><b style="color:${col}">${kLabel(M, k)}${rung ? ` · ${rung[1].toFixed(2)} · ${rung[3] > 0 ? "+" : ""}${rung[3].toFixed(0)}% EV` : " · no bet365 price"}</b><span>${proj != null ? `proj ${(+proj).toFixed(1)}` : ""}${hasMin && p.exp_min != null ? ` · ${(+p.exp_min).toFixed(0)}m` : ""}${subs ? ` · <b style="color:${SS_COL}">■</b> super sub` : ""}</span></div>`
      + `<svg class=chart viewBox="0 0 ${W} ${H}" role=img aria-label="${esc(s.m)} last ${n}">${bars}${next}${mins}${labels}`
      + `<line x1="${pad}" x2="${W - padR}" y1="${ly}" y2="${ly}" stroke="${col}" stroke-dasharray="3 2"/><text x="${pad - 3}" y="${ly + 3}" text-anchor=end font-size=7.5 font-weight=600 fill="${col}">${esc(kLabel(M, k))}</text></svg>`;
    const TV = tot(M), RV = TV.slice(-n);
    const hr = xs => xs.length ? Math.round(100 * xs.filter(v => hitOf(M, v, k)).length / xs.length) : null;
    const hrK = (xs, kk) => xs.length ? Math.round(100 * xs.filter(v => hitOf(M, v, kk)).length / xs.length) : null;
    const avg = RV.length ? RV.reduce((a, b) => a + b, 0) / RV.length : 0;
    // controls under the graph: games shown, move the line, projection on/off
    const ranges = [5, 10, 15, 20, 30].filter(x => x < M.v.length).concat([M.v.length]);
    const kmax = Math.max(5, Math.ceil(Math.max(...TV, M.proj || 0) * 1.3));
    el.querySelector(".fx-ctl2").innerHTML = `<div class=fx-rng>${ranges.map(x => `<button data-n="${x}" class="${x === n ? "on" : ""}">${x === M.v.length ? `All ${x}` : `L${x}`}</button>`).join("")}`
      + (M.proj != null ? `<button data-p=1 class="${s.proj ? "on" : ""}">Projection</button>` : "") + `</div>`
      + `<div class=fx-mv><button data-d=-1 aria-label="Lower the line">−</button><input type=range min="${M.under ? 0.5 : 1}" max="${kmax + (M.under ? 0.5 : 0)}" step=1 value="${k}" aria-label="Move the line"><button data-d=1 aria-label="Raise the line">+</button><span>${kLabel(M, k)}</span></div>`;
    el.querySelectorAll(".fx-rng button[data-n]").forEach(b => b.onclick = () => { s.n = +b.dataset.n; draw(p); });
    const pb = el.querySelector(".fx-rng button[data-p]"); if (pb) pb.onclick = () => { s.proj = !s.proj; draw(p); };
    el.querySelectorAll(".fx-mv button").forEach(b => b.onclick = () => { s.k = Math.max(M.under ? 0.5 : 1, s.k + +b.dataset.d); draw(p); });
    el.querySelector(".fx-mv input").oninput = e => { s.k = +e.target.value; draw(p); };
    // right-hand panel: the line being looked at, its price and EV, then every bet365 line
    const fair = rung ? 100 / Math.max(rung[2], 0.1) : null, h = hr(RV);
    el.querySelector(".fx-sum").innerHTML = `<div class=fx-big><span>${esc(D.short?.[s.m] || s.m)}</span><b>${kLabel(M, k)}</b></div>`
      + `<div class=fx-kv>`
      + `<div><b>${rung ? rung[1].toFixed(2) : "–"}</b><span>${rung ? "bet365" : "no price"}</span></div>`
      + `<div><b style="color:${col}">${rung ? (rung[3] > 0 ? "+" : "") + rung[3].toFixed(0) + "%" : "–"}</b><span>EV</span></div>`
      + `<div><b>${rung ? rung[2].toFixed(0) + "%" : "–"}</b><span>model</span></div>`
      + `<div><b>${fair ? fair.toFixed(2) : "–"}</b><span>fair odds</span></div>`
      + `<div><b class="${h >= 60 ? "pos" : h < 40 ? "neg" : ""}">${h ?? "–"}%</b><span>hit L${RV.length}</span></div>`
      + `<div><b>${M.proj != null ? (+M.proj).toFixed(1) : avg.toFixed(1)}</b><span>${M.proj != null ? "projected" : "average"}</span></div>`
      + `</div>`;
    el.querySelector(".fx-rt").innerHTML = RG(M).length
      ? `<table><tr><th>Line</th><th>Odds</th><th>Model</th><th>EV</th><th>Hit L${RV.length}</th></tr>`
        + RG(M).map(r => { const hk = hrK(RV, r[0]); return `<tr data-k="${r[0]}" class="${isVal(r) ? "val " : ""}${r[0] === k ? "on" : ""}"><td>${kLabel(M, r[0])}</td><td>${r[1].toFixed(2)}</td><td>${r[2].toFixed(0)}%</td>`
          + `<td class="${r[3] >= 0 ? "pos" : "neg"}">${r[3] > 0 ? "+" : ""}${r[3].toFixed(0)}%</td><td>${hk}%</td></tr>`; }).join("") + `</table>`
      : `<p class=meta>No bet365 price for ${esc(s.m)}. Move the line to see hit rates.</p>`;
    el.querySelectorAll(".fx-rt tr[data-k]").forEach(t => t.onclick = () => { s.k = +t.dataset.k; draw(p); });
    const sm = document.getElementById("s" + p.pid);
    if (sm) {
      const tm = g[p.team] || {}, l10 = TV.slice(-10), h10 = l10.filter(v => hitOf(M, v, k)).length, s10 = st.ss && M.vs ? M.vs.slice(-10) : [];
      sm.innerHTML = `${img(p.face, "fx-face sm")}<div class=fx-lw><b>${esc(p.name)}</b><small>${img(tm.logo, "fx-mini")}${esc(tm.abbr || "")} · ${esc(D.short?.[s.m] || s.m)} ${kLabel(M, k)}${p.tag ? ` <span class="fx-tag ${esc(p.tag_cls || "")}">${esc(p.tag)}</span>` : ""}</small></div>`
        + `<div class=fx-lt10>${l10.map((v, i) => `<i class="${hitOf(M, v, k) ? "h" : "m"}${s10[i] ? " s" : ""}"${s10[i] ? ` title="+${s10[i]} Super Sub"` : ""}>${v}</i>`).reverse().join("")}</div>`
        + `<div class=c><b>${h10}/${l10.length}</b><small>L10</small></div>`
        + `<div class=c><b>${rung ? rung[1].toFixed(2) : "–"}</b><small>${rung ? rung[2].toFixed(0) + "%" : "no price"}</small></div>`
        + `<div class=c><b style="color:${col}">${rung ? (rung[3] > 0 ? "+" : "") + rung[3].toFixed(0) + "%" : "–"}</b><small>EV</small></div>`;
    }
    el.querySelector(".fx-hr").innerHTML = [["L5", TV.slice(-5)], ["L10", TV.slice(-10)], [`All ${TV.length}`, TV]].map(([l, xs]) => {
      const h = hr(xs); return h == null ? "" : `<div class="${h >= 60 ? "good" : h < 40 ? "bad" : ""}"><b>${h}%</b><span>${l}</span></div>`; }).join("")
      + `<div><b>${avg.toFixed(1)}</b><span>avg L${RV.length}</span></div>`;
  }
  cards();
}
})();
