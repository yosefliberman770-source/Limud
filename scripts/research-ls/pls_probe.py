#!/usr/bin/env python3 -I
"""Probe projectlikkuteisichos.org main sicha pages (/<vol><parsha><n>/) for every sicha in
raw/tr-index.json; downloads found pages into raw/pls/<slug>.html and writes raw/pls-slugs.json"""
import json, re, os, subprocess, sys, time
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
idx = json.load(open('raw/tr-index.json', encoding='utf-8'))
ALT = {
 'bereishis': ['breishis', 'bereishis'], 'noach': ['noach'], 'lech lecha': ['lech-lecha', 'lechlecha'],
 'vayera': ['vayera'], 'chayei sarah': ['chayesara', 'chayei-sara', 'chayeisarah'], 'toldos': ['toldos'],
 'vayeitzei': ['vayetze', 'vayeitzei', 'vayetzei'], 'vayishlach': ['vayishlach'], 'vayeishev': ['vayeshev', 'vayeishev'],
 'mikeitz': ['miketz', 'mikeitz'], 'chanukah': ['chanukah'], 'vayigash': ['vayigash'], 'vayechi': ['vayechi'],
 'shemos': ['shemos'], "va'era": ['vaera'], 'bo': ['bo'], 'beshalach': ['beshalach'], 'yisro': ['yisro', 'yitro'],
 'mishpatim': ['mishpatim'], 'terumah': ['terumah', 'teruma'], 'tetzaveh': ['tetzaveh', 'tetzave'], 'ki sisa': ['kisisa', 'ki-sisa', 'kitisa', 'tisa', 'sisa'],
 'vayakhel': ['vayakhel'], 'pekudei': ['pekudei'], 'vayikra': ['vayikra'], 'tzav': ['tzav'], 'shabbos hagadol': ['shabboshagadol', 'shabbos-hagadol', 'shabbat-hagadol'],
 'chag hapesach': ['pesach', 'chaghapesach', 'chag-hapesach'], 'shemini': ['shemini', 'shmini'], 'tazria': ['tazria'], 'metzora': ['metzora'],
 'acharei': ['acharei', 'achrei'], 'kedoshim': ['kedoshim'], 'emor': ['emor'], 'behar': ['behar'], 'bechukosai': ['bechukosai', 'bechukotai'],
 'bamidbar': ['bamidbar'], 'naso': ['nasso', 'naso'], "beha'aloscha": ['behalosecha', 'behaaloscha', 'behaalosecha'], 'shelach': ['shelach', 'shlach'],
 'korach': ['korach'], 'chukas': ['chukas'], 'balak': ['balak'], 'pinchas': ['pinchas'], 'matos': ['matos'], 'masei': ['masei'],
 'devarim': ['devarim'], "va'eschanan": ['vaeschanan'], 'eikev': ['ekev', 'eikev'], "re'eh": ['reeh'], 'shoftim': ['shoftim'],
 'ki seitzei': ['tetze', 'kiseitzei', 'ki-tetze', 'teitzei'], 'ki savo': ['tavo', 'kisavo', 'ki-tavo'], 'nitzavim': ['nitzavim'],
 'rosh hashanah': ['roshhashana', 'rosh-hashana', 'roshhashanah'], 'vayeilech': ['vayelech', 'vayeilech'], "ha'azinu": ['haazinu'],
 'vezos haberachah': ['bracha', 'vzoshabracha', 'brocho', 'vezoshabracha'], 'index (mafteichos)': [],
}
out = {}
for v, items in idx.items():
    vol = int(v)
    for it in items:
        lab = it['lines'][1]  # "Likkutei Sichos Vol. 10 – Bereishis 1 – ..."
        m = re.match(r"Likkutei Sichos Vol\. \d+ [–-] (.+?)(?: [–-] .*)?$", lab)
        name = m.group(1).strip() if m else lab
        name = name.split(' / ')[0]
        mm = re.match(r"(.+?)(?: (\d+))?$", name)
        base, num = mm.group(1).strip().lower(), mm.group(2)
        cands = []
        for a in ALT.get(base, [re.sub(r'[^a-z]', '', base)]):
            cands.append(f"{vol}{a}{num or ''}")
            if not num: cands.append(f"{vol}{a}1")
        key = it['path'].split('/')[-1]
        found = None
        for c in cands:
            fn = f"raw/pls/{c}.html"
            if os.path.exists(fn) and os.path.getsize(fn) > 0:
                found = c; break
            code = subprocess.run(['curl', '-sS', '-A', UA, '-o', fn, '-w', '%{http_code}', f'https://projectlikkuteisichos.org/{c}/'], capture_output=True, text=True).stdout.strip()
            if code == '200':
                found = c; break
            else:
                try: os.remove(fn)
                except FileNotFoundError: pass
            time.sleep(0.2)
        out[f"{vol}/{key}"] = {'label': lab, 'base': base, 'num': num, 'candidates': cands, 'slug': found}
        print(vol, key, base, num, '->', found, flush=True)
json.dump(out, open('raw/pls-slugs.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
