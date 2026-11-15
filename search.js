// Forgiving search for every sport: ignores accents and punctuation, allows typos, and knows team nicknames.
//   SR.norm("Kökçü")              -> "kokcu"
//   SR.score("mbape", "Kylian Mbappé")  -> > 0 (typo allowed)
//   SR.score("spurs", "Tottenham Hotspur", SR.aliases("Tottenham Hotspur")) -> > 0
// score() returns 0 for no match; higher is better (exact substring > prefix > typo).
(() => {
const MAP = {"ø": "o", "æ": "ae", "œ": "oe", "ß": "ss", "ł": "l", "đ": "d", "ð": "d", "þ": "th", "ı": "i", "ħ": "h", "ŋ": "n"};
const norm = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[øæœßłđðþıħŋ]/g, c => MAP[c]).replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();

// nicknames / short names -> searched alongside the full team name (keys and values are normalised on load)
const NICK = {
  // football
  "tottenham hotspur": ["spurs", "tottenham", "thfc"], "manchester united": ["man utd", "man united", "united", "mufc", "red devils"],
  "manchester city": ["man city", "city", "mcfc", "citizens"], "arsenal": ["gunners", "afc"], "chelsea": ["blues", "cfc"],
  "liverpool": ["reds", "lfc"], "everton": ["toffees", "efc"], "west ham united": ["west ham", "hammers", "irons", "whu"],
  "aston villa": ["villa", "avfc"], "newcastle united": ["newcastle", "toon", "magpies", "nufc"], "wolverhampton wanderers": ["wolves"],
  "nottingham forest": ["forest", "nffc"], "crystal palace": ["palace", "eagles"], "brighton and hove albion": ["brighton", "seagulls"],
  "leicester city": ["leicester", "foxes"], "leeds united": ["leeds"], "middlesbrough": ["boro"], "sheffield united": ["blades", "sheff utd"],
  "sheffield wednesday": ["owls", "sheff wed"], "west bromwich albion": ["west brom", "baggies", "wba"], "queens park rangers": ["qpr"],
  "afc bournemouth": ["bournemouth", "cherries"], "brentford": ["bees"], "fulham": ["cottagers"], "burnley": ["clarets"],
  "sunderland": ["black cats"], "southampton": ["saints"], "ipswich town": ["ipswich", "tractor boys"], "norwich city": ["canaries"],
  "barcelona": ["barca", "fcb"], "real madrid": ["real", "madrid", "los blancos"], "atletico madrid": ["atleti", "atletico"],
  "paris saint germain": ["psg", "paris"], "juventus": ["juve"], "internazionale": ["inter", "inter milan"], "inter": ["inter milan"],
  "ac milan": ["milan"], "bayern munich": ["bayern", "fcb"], "bayern munchen": ["bayern", "bayern munich"],
  "borussia dortmund": ["dortmund", "bvb"], "bayer leverkusen": ["leverkusen"], "borussia monchengladbach": ["gladbach"],
  "rb leipzig": ["leipzig"], "olympique de marseille": ["marseille", "om"], "olympique lyonnais": ["lyon", "ol"],
  "celtic": ["bhoys", "celts"], "rangers": ["gers"], "sporting cp": ["sporting", "sporting lisbon"], "benfica": ["eagles"],
  "ajax": ["ajax amsterdam"], "psv eindhoven": ["psv"], "napoli": ["ssc napoli"], "as roma": ["roma"], "ss lazio": ["lazio"],
  "athletic club": ["athletic bilbao", "bilbao"], "real sociedad": ["la real", "sociedad"], "real betis": ["betis"],
  "sevilla": ["sevilla fc", "seville"], "villarreal": ["yellow submarine"], "fenerbahce": ["fener"], "galatasaray": ["gala", "cimbom"],
  "besiktas": ["bjk"], "fc porto": ["porto"], "club brugge": ["brugge", "bruges"], "red bull salzburg": ["salzburg"],
  "eintracht frankfurt": ["frankfurt", "sge"], "vfb stuttgart": ["stuttgart"], "werder bremen": ["bremen"], "fiorentina": ["viola"],
  "atalanta": ["la dea"], "torino": ["toro"], "hearts": ["heart of midlothian", "jambos"], "hibernian": ["hibs"],
  "wrexham": ["red dragons"], "coventry city": ["sky blues"], "stoke city": ["potters"], "hull city": ["tigers"],
  "united states": ["usa", "usmnt"], "england": ["three lions"], "netherlands": ["holland"], "turkiye": ["turkey"],
  "republic of ireland": ["ireland"], "ivory coast": ["cote d ivoire"], "cote d ivoire": ["ivory coast"], "south korea": ["korea republic"],
  // NBA
  "golden state warriors": ["dubs", "warriors", "gsw"], "philadelphia 76ers": ["sixers", "76ers"], "cleveland cavaliers": ["cavs"],
  "dallas mavericks": ["mavs"], "minnesota timberwolves": ["wolves", "twolves"], "portland trail blazers": ["blazers", "rip city"],
  "boston celtics": ["celts", "cs"], "los angeles lakers": ["lakers", "lal"], "la clippers": ["clips", "clippers"],
  "los angeles clippers": ["clips", "clippers"], "new york knicks": ["knicks"], "brooklyn nets": ["nets"],
  "oklahoma city thunder": ["okc", "thunder"], "san antonio spurs": ["spurs"], "new orleans pelicans": ["pels", "pelicans"],
  "memphis grizzlies": ["grizz"], "sacramento kings": ["kings"], "washington wizards": ["wiz"], "miami heat": ["heat"],
  "toronto raptors": ["raps"], "denver nuggets": ["nugs", "nuggets"], "milwaukee bucks": ["bucks"], "atlanta hawks": ["hawks"],
  "orlando magic": ["magic"], "houston rockets": ["rockets"], "phoenix suns": ["suns"], "utah jazz": ["jazz"], "detroit pistons": ["pistons"],
  "indiana pacers": ["pacers"], "chicago bulls": ["bulls"], "charlotte hornets": ["hornets", "buzz city"],
  // NHL
  "montreal canadiens": ["habs"], "toronto maple leafs": ["leafs"], "pittsburgh penguins": ["pens"], "washington capitals": ["caps"],
  "tampa bay lightning": ["bolts"], "chicago blackhawks": ["hawks"], "detroit red wings": ["wings"], "colorado avalanche": ["avs"],
  "carolina hurricanes": ["canes"], "ottawa senators": ["sens"], "new york islanders": ["isles"], "nashville predators": ["preds"],
  "columbus blue jackets": ["jackets", "cbj"], "vegas golden knights": ["knights", "vgk"], "new jersey devils": ["devils"],
  "new york rangers": ["rangers", "nyr"], "philadelphia flyers": ["flyers"], "boston bruins": ["bruins", "bs"], "florida panthers": ["cats"],
  "edmonton oilers": ["oilers"], "calgary flames": ["flames"], "winnipeg jets": ["jets"], "vancouver canucks": ["nucks"],
  "los angeles kings": ["kings"], "anaheim ducks": ["ducks"], "san jose sharks": ["sharks"], "seattle kraken": ["kraken"],
  "minnesota wild": ["wild"], "st louis blues": ["blues"], "dallas stars": ["stars"], "buffalo sabres": ["sabres"], "utah mammoth": ["mammoth"],
  // NFL
  "san francisco 49ers": ["niners", "49ers"], "new england patriots": ["pats"], "tampa bay buccaneers": ["bucs"],
  "jacksonville jaguars": ["jags"], "new york giants": ["g men", "giants"], "miami dolphins": ["fins", "phins"],
  "green bay packers": ["pack", "packers"], "las vegas raiders": ["raiders"], "kansas city chiefs": ["chiefs", "kc"],
  "philadelphia eagles": ["birds", "eagles"], "dallas cowboys": ["boys", "cowboys"], "washington commanders": ["commanders"],
  "los angeles chargers": ["bolts", "chargers"], "los angeles rams": ["rams"], "pittsburgh steelers": ["steelers"],
  "baltimore ravens": ["ravens"], "cincinnati bengals": ["bengals"], "cleveland browns": ["browns"], "minnesota vikings": ["vikes"],
  "chicago bears": ["bears"], "detroit lions": ["lions"], "seattle seahawks": ["hawks", "seahawks"], "arizona cardinals": ["cards"],
  "atlanta falcons": ["falcons"], "carolina panthers": ["panthers"], "new orleans saints": ["saints"], "buffalo bills": ["bills"],
  "new york jets": ["jets"], "houston texans": ["texans"], "indianapolis colts": ["colts"], "tennessee titans": ["titans"],
  "denver broncos": ["broncos"],
};
const NK = {};
for (const [k, v] of Object.entries(NICK)) NK[norm(k)] = v.map(norm);
const aliases = name => {
  const n = norm(name);
  if (NK[n]) return NK[n];
  for (const k in NK) if (k.length > 5 && (n.includes(k) || k.includes(n) && n.length > 5)) return NK[k];   // "Tottenham" ~ "Tottenham Hotspur"
  return [];
};

// edit distance with an early exit once it passes `max`
function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let pp = null, prev = Array.from({length: b.length + 1}, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]; let best = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (pp && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], pp[j - 2] + 1);   // swapped letters
      best = Math.min(best, cur[j]);
    }
    if (best > max) return max + 1;
    pp = prev; prev = cur;
  }
  return prev[b.length];
}
const allow = len => len >= 8 ? 2 : len >= 5 ? 1 : 0;      // typos allowed per word (none under 5 letters, so "mavs" != "mars")
function tokScore(q, t) {
  if (t === q) return 3;
  if (t.startsWith(q)) return 2.5;
  if (q.length >= 3 && t.includes(q)) return 2;
  const m = allow(q.length);
  if (!m) return 0;
  if (lev(q, t, m) <= m) return 1.5;                         // whole word, misspelt
  if (t.length > q.length && lev(q, t.slice(0, q.length), m) <= m) return 1;   // start of a word, misspelt
  return 0;
}
function score(query, text, extra = []) {
  const q = norm(query);
  if (!q) return 1;
  let best = 0;
  // also try everything joined, so "okc thunder" matches Oklahoma City Thunder (+ nickname okc)
  for (const s of [text, ...extra, ...(extra.length ? [[text, ...extra].join(" ")] : [])]) {
    const t = norm(s);
    if (!t) continue;
    if (t === q) return 10;
    if (t.includes(q)) { best = Math.max(best, t.startsWith(q) || t.includes(" " + q) ? 8 : 6); continue; }
    const tt = t.split(" "), qt = q.split(" ");
    let sum = 0, ok = true;
    for (const w of qt) {                                    // every word typed must match some word
      const s = Math.max(0, ...tt.map(x => tokScore(w, x)));
      if (!s) { ok = false; break; }
      sum += s;
    }
    if (ok) best = Math.max(best, sum / qt.length + (qt.length > 1 ? 1 : 0));
    else if (qt.length === 1 && q.length >= 5 && lev(q, t.replace(/ /g, ""), allow(q.length)) <= allow(q.length)) best = Math.max(best, 1.2);  // "mbappe" vs "mbappe"
  }
  return best;
}
window.SR = {norm, score, aliases, lev};
})();
