#!/usr/bin/env python3
"""
Синхронизирует корневые pageNNNNNNNN.html с копиями в подпапках для GitHub Pages
(GitHub Pages не умеет .htaccess rewrite, поэтому у каждого красивого URL
есть папка со своим index.html - копией соответствующего pageNNNNNNNN.html
с абсолютными путями к ассетам).

Запускать из корня репозитория после любого редактирования page*.html,
которые входят в маппинг ниже, и перед git push.
"""
import os
import re

PAIRS = {
    # "centr-reabilitatsii-zabota" removed: duplicate of homepage (same source file),
    # now a static 301-style redirect page (centr-reabilitatsii-zabota/index.html), not synced.
    "travma": "page26192977.html",
    "header": "page26192735.html",
    "posle_coronavirusa": "page26193313.html",
    # "recomendatsi" removed: was an empty stub, merged into /posle_coronavirusa,
    # now a static 301-style redirect page (recomendatsi/index.html), not synced.
    "lechebny_massazh": "page26193316.html",
    "insult": "page26193335.html",
    "statsionar": "page26193347.html",
    "prolejni": "page26279934.html",
    "obrabotkaprolejnei": "page26379409.html",
    "tyjelobolnie": "page26286567.html",
    "protesirovanie": "page26193344.html",
    "blagotvoritelnost": "page26216568.html",
    "stoimost": "page26320230.html",
    "otravlenie": "page26679435.html",
    "troficheskye_yazvy": "page28128056.html",
    "kapelnitsy_na_domu": "page28128086.html",
    "shvy_na_domu": "page90000001.html",
    "vosstanovlenie_rechi": "page90000002.html",
    "ortopedicheskie_stelki": "page90000003.html",
    "hirurgiya": "page32597332.html",
    "reabilitatsia": "page32611802.html",
    "nevrologiya": "page32612688.html",
    "psihoterapiya": "page32614877.html",
    "diagnostika": "page32615297.html",
    "lechenie_vrosshego_nogtya": "page38253631.html",
    "travmatolog-ortoped-na-dom-moskva": "page39404216.html",
}
HOMEPAGE_SRC = "page26151720.html"

def fix_paths(t: str) -> str:
    t = re.sub(r'href="css/', 'href="/css/', t)
    t = re.sub(r'src="js/', 'src="/js/', t)
    t = re.sub(r'src="images/', 'src="/images/', t)
    t = re.sub(r'href="images/', 'href="/images/', t)
    t = re.sub(r'data-original="images/', 'data-original="/images/', t)
    t = re.sub(r'content="images/', 'content="/images/', t)
    t = re.sub(r"url\('images/", "url('/images/", t)
    t = re.sub(r'url\("images/', 'url("/images/', t)
    t = re.sub(r"action='mail\.php'", "action='https://formspree.io/f/xkjjkvpe'", t)
    t = re.sub(r"action='/mail\.php'", "action='https://formspree.io/f/xkjjkvpe'", t)
    return t

def main():
    changed = []
    # root index.html (homepage) - no path fixing needed, already root-relative
    t = open(HOMEPAGE_SRC, encoding='utf-8').read()
    old = open('index.html', encoding='utf-8').read() if os.path.exists('index.html') else None
    if old != t:
        open('index.html', 'w', encoding='utf-8').write(t)
        changed.append('index.html')

    for slug, src in PAIRS.items():
        if not os.path.exists(src):
            print('MISSING SOURCE:', src)
            continue
        t = open(src, encoding='utf-8').read()
        t = fix_paths(t)
        dst = os.path.join(slug, 'index.html')
        old = open(dst, encoding='utf-8').read() if os.path.exists(dst) else None
        if old != t:
            os.makedirs(slug, exist_ok=True)
            open(dst, 'w', encoding='utf-8').write(t)
            changed.append(dst)

    print(f'Updated {len(changed)} file(s):')
    for c in changed:
        print(' ', c)

if __name__ == '__main__':
    main()
