#!/usr/bin/env python3
"""Kilavuzdan (guide.md) uygulamanin ornek / kural verisini cikarir.

Kullanim:  python3 extract_guide.py [guide.md] [cikti.json]

Kilavuz degisince bu betigi yeniden calistirip uygulamayi yeniden derlemek yeterlidir.
Cikti:  letters (harf kartlari), pairs, sentences, drills, texts, mistakes, stressRows
"""
import json, re, sys, os

SRC = sys.argv[1] if len(sys.argv) > 1 else "/home/claude/kilavuz_kaynak/build/guide.md"
OUT = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "data", "guide_bank.json")

text = open(SRC, encoding="utf-8").read()
lines = text.split("\n")

def strip_md(s):
    return s.replace("**", "").strip()

def split_row(line):
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return cells

# ---------- bolumlere ayir ----------
sections = []  # (level, title, start, end)
for i, l in enumerate(lines):
    m = re.match(r"^(#{2,4}) (.+)$", l)
    if m:
        sections.append([len(m.group(1)), m.group(2).strip(), i, None])
for k, s in enumerate(sections):
    s[3] = sections[k + 1][2] if k + 1 < len(sections) else len(lines)

def body(sec):
    return lines[sec[2] + 1: sec[3]]

def words_from_cell(cell):
    """'**b**aba, **b**alık' -> ['baba','balık'] (virgulle ayrilmis)"""
    cell = strip_md(cell)
    # parantez ici aciklamalari at
    cell = re.sub(r"\(.*?\)", "", cell)
    out = []
    for w in re.split(r"[,;]", cell):
        w = w.strip()
        if w and re.match(r"^[A-Za-zÇĞİÖŞÜâîûçğıöşü' \-]+$", w):
            out.append(w)
    return out

def pairs_from_cell(cell):
    cell = strip_md(cell)
    res = []
    for part in re.split(r",", cell):
        m = re.match(r"^\s*([^\s–-]+)\s*[–-]\s*([^\s–-]+)\s*$", part)
        if m:
            res.append([m.group(1), m.group(2)])
    return res

letters = {}
for sec in sections:
    lvl, title, a, b = sec
    m = re.match(r"^([a-zçğıöşüA-Z]): (.+)$", title)
    if lvl == 4 and m and (a > 227):
        ch = m.group(1)
        info = {"letter": ch, "title": title, "kind": "unlu" if ch in "aeıioöuü" else "unsuz",
                "how": "", "start": [], "mid": [], "end": [], "syl": "", "pairs": [], "sentence": "",
                "careful": "", "extra": {}}
        for l in body(sec):
            if l.startswith("**Nasıl çıkar:**"):
                info["how"] = strip_md(l.split(":**", 1)[1])
            elif l.startswith("**Dikkat:**"):
                info["careful"] = strip_md(l.split(":**", 1)[1])
            elif l.startswith("**Cümle:**"):
                info["sentence"] = strip_md(l.split(":**", 1)[1])
            elif l.startswith("**Cümleler:**"):
                info["sentence"] = strip_md(l.split(":**", 1)[1])
            elif l.startswith("**Hece çiftleri:**"):
                info["extra"]["syllablePairs"] = strip_md(l.split(":**", 1)[1])
            elif l.startswith("|"):
                cells = split_row(l)
                if len(cells) >= 2 and cells[0] not in ("Yer", "---", "Yanındaki ünlü", "Hece nasıl biter?", "Sözcük"):
                    key = cells[0].lower()
                    val = cells[-1]
                    if key.startswith("başta"):
                        info["start"] += words_from_cell(val)
                    elif key.startswith("ortada"):
                        info["mid"] += words_from_cell(val)
                    elif key.startswith("sonda"):
                        info["end"] += words_from_cell(val)
                    elif key.startswith("hece") and "-" in strip_md(val):
                        info["syl"] = strip_md(val)
                    elif re.search(r"\s[–-]\s", strip_md(val)) and re.match(r"^[a-zçğıöşü]+\s*[–-]\s*[a-zçğıöşü]+$", cells[0].replace("ı", "ı")):
                        info["pairs"] += pairs_from_cell(val)
                    elif re.search(r"\s[–-]\s", strip_md(val)) and not key.startswith(("kapalı", "ince a", "kalın", "alıntı")):
                        info["pairs"] += pairs_from_cell(val)
        letters[ch] = info

# ---------- e karti: acik/kapali ornek sozcukler ----------
e_open, e_closed = [], []
for l in lines[250:272]:
    if l.startswith("| l, m, n, r ile"):
        e_open = words_from_cell(split_row(l)[2])
    if l.startswith("| Başka bir sesle"):
        e_closed = words_from_cell(split_row(l)[2])

for sec in sections:
    if sec[1].startswith("ğ:"):
        for l in body(sec):
            if l.startswith("| İki ünlü arasında"):
                letters["ğ"]["mid"] += words_from_cell(split_row(l)[2])
            elif l.startswith("| Ünsüzden önce"):
                letters["ğ"]["mid"] += words_from_cell(split_row(l)[2])
            elif l.startswith("| Sözcük sonunda"):
                letters["ğ"]["end"] += words_from_cell(split_row(l)[2])
            elif l.startswith("**Fark çiftleri:**"):
                letters["ğ"]["pairs"] += pairs_from_cell(strip_md(l.split(":**", 1)[1]).rstrip("."))
letters["e"]["start"] = [w for w in e_closed if w.startswith("e")][:3]
letters["e"]["mid"] = e_open + [w for w in e_closed if not w.startswith("e")]
letters["e"]["end"] = ["de", "ne", "be"]
letters["e"]["pairs"] = [["gel", "ge"], ["ben", "be"], ["ver", "ve"], ["sen", "se"], ["tel", "te"]]

# ---------- grup calismalari (tekerleme/cumle) ----------
groups = []
cur = None
in_group = False
for sec in sections:
    if sec[1] == "Grup çalışmaları":
        in_group = True
        g_start, g_end = sec[2], sec[3]
for l in lines[g_start:g_end]:
    m = re.match(r"^\*\*(\d+)\. (.+?)\*\*$", l)
    if m:
        cur = {"no": int(m.group(1)), "title": m.group(2), "syl": "", "words": "", "sentences": [], "twisters": [], "pairs": ""}
        groups.append(cur)
        continue
    if cur and l.startswith("- **"):
        m2 = re.match(r"^- \*\*(.+?):\*\* (.+)$", l)
        if m2:
            k, v = m2.group(1), m2.group(2)
            if k == "Hece": cur["syl"] = v
            elif k == "Sözcük": cur["words"] = v
            elif k.startswith("Cümle") or k == "j": cur["sentences"].append(v)
            elif k.startswith("Tekerleme"): cur["twisters"].append(v)
            elif k.startswith("İkililer") or k.startswith("Kalın"): cur["pairs"] += v + " "
    elif cur and l.startswith("- ") and cur["no"] == 9:
        cur["twisters"].append(l[2:])

# ---------- alistirma bankasi ----------
def section_by_title(t):
    for s in sections:
        if s[1] == t:
            return s
    return None

twisters = []
s = section_by_title("3. Karışık tekerlemeler")
for l in body(s):
    if l.startswith("- "):
        twisters.append(l[2:])
for g in groups:
    twisters += g["twisters"]

work_sentences = []
s = section_by_title("5. İş yeri cümleleri")
for l in body(s):
    if l.startswith("- "):
        work_sentences.append(l[2:])

texts = {}
s = section_by_title("4. Okuma metinleri")
mode = None
for l in body(s):
    m = re.match(r"^\*\*(.+?)\*\*$", l)
    if m:
        mode = m.group(1)
    elif l.startswith("> ") and mode:
        texts[mode] = l[2:].strip()

# ---------- sik yanlis soylenenler ----------
mistakes = []
s = section_by_title("Sık yanlış söylenen sözcükler")
for l in body(s):
    if l.startswith("|"):
        c = split_row(l)
        if c[0] not in ("Yanlış", "---"):
            mistakes.append({"wrong": c[0], "right": c[1], "note": c[2]})

# ---------- vurgu tablosu ----------
stress_rows = []
s = section_by_title("Kelime vurgusu")
for l in body(s):
    if l.startswith("|"):
        c = split_row(l)
        if c[0] not in ("Durum", "---"):
            stress_rows.append({"case": c[0], "example": c[1]})

# ---------- cumle vurgu alistirmasi ----------
accent_examples = []
s = section_by_title("Cümle vurgusu")
for l in body(s):
    if l.startswith("- ") and "**" in l:
        accent_examples.append(l[2:])

# ---------- ulama tablosu ----------
liaison = []
s = section_by_title("Ulama")
for l in body(s):
    if l.startswith("|"):
        c = split_row(l)
        if c[0] not in ("Yazılış", "---"):
            liaison.append({"written": c[0], "spoken": c[1]})

# ---------- iki unlu yan yana ----------
vv = []
s = section_by_title("Yan yana iki ünlü")
for l in body(s):
    if l.startswith("|"):
        c = split_row(l)
        if c[0] not in ("Sözcük", "---"):
            vv.append({"word": c[0], "syl": c[1], "note": strip_md(c[2])})

# ---------- karistirilan unlu ciftleri ----------
confusables = []
s = section_by_title("Karıştırılan ünlü ikilileri")
for l in body(s):
    m = re.match(r"^- \*\*(.+?):\*\* (.+)$", l)
    if m:
        confusables.append({"pair": m.group(1), "items": [p.strip() for p in m.group(2).split(",")]})

# ---------- kisa 'tek bakista' acikla (harf basina Dikkat) ----------
quick = {}
s = section_by_title("Tek bakışta: harf harf başvuru tablosu")
for l in body(s):
    if l.startswith("|"):
        c = split_row(l)
        if c[0] not in ("Harf", "---"):
            quick[c[0]] = {"place": c[1], "how": c[2], "care": c[3]}

# ---------- ünlü kısa tarif ----------
vowel_how = {}
s = section_by_title("Her ünlü nasıl çıkar?")
for l in body(s):
    if l.startswith("|"):
        c = split_row(l)
        if c[0] not in ("Ünlü", "---"):
            vowel_how[c[0]] = {"how": c[1], "error": c[2]}

bank = {
    "source": os.path.basename(SRC),
    "letters": letters,
    "eOpen": e_open, "eClosed": e_closed,
    "groups": groups,
    "twisters": twisters,
    "workSentences": work_sentences,
    "texts": texts,
    "mistakes": mistakes,
    "stressRows": stress_rows,
    "accentExamples": accent_examples,
    "liaison": liaison,
    "vowelPairs": vv,
    "confusables": confusables,
    "quick": quick,
    "vowelHow": vowel_how,
}

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(bank, f, ensure_ascii=False, indent=1)

print("harf kartı:", len(letters), sorted(letters.keys()))
print("açık e:", len(e_open), "kapalı e:", len(e_closed))
print("grup:", len(groups), "tekerleme:", len(twisters), "iş cümlesi:", len(work_sentences))
print("metin:", list(texts.keys()))
print("yanlış sözcük:", len(mistakes), "vurgu satırı:", len(stress_rows), "ulama:", len(liaison))
tot = sum(len(v["start"]) + len(v["mid"]) + len(v["end"]) for v in letters.values())
print("kartlardaki toplam sözcük:", tot)
miss = [c for c, v in letters.items() if not (v["start"] or v["mid"] or v["end"])]
print("sözcüksüz kart:", miss)
