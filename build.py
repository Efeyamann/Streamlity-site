"""Builds the Streamlity website into dist/.

No dependencies: a single HTML template (src/index.html) is filled with the
strings of each language in src/i18n/<lang>.json. English is served at the
site root, every other language under /<lang>/.

    python build.py                 # production build (base /Streamlity-site/)
    python build.py --base /        # local preview: python -m http.server -d dist
"""

import argparse
import html
import json
import re
import shutil
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

SITE_ORIGIN = "https://efeyamann.github.io"
BASE = "/Streamlity-site/"
LANGS = ["en", "tr"]  # first one is the default (site root, x-default)

REPO = "https://github.com/Efeyamann/Streamlity"
VERSION = "0.1.0"  # latest version published on GitHub Releases
STORE_URL = ""  # Microsoft Store page, once the listing is live


def downloads(version: str) -> dict:
    tag = f"{REPO}/releases/download/v{version}/Streamlity-{version}"
    return {
        "dl_win": f"{tag}-windows-x64-setup.exe",
        "dl_win_zip": f"{tag}-windows-x64.zip",
        "dl_mac": f"{tag}-macos.dmg",
        "dl_deb": f"{tag}-linux-amd64.deb",
        "dl_tar": f"{tag}-linux-x64.tar.gz",
        "releases": f"{REPO}/releases",
        "repo": REPO,
    }


def page_path(lang: str) -> str:
    return "" if lang == LANGS[0] else f"{lang}/"


def faq_html(items: list) -> str:
    out = []
    for item in items:
        out.append(
            '<details class="faq-item">'
            f'<summary><span>{item["q"]}</span><svg class="faq-icon" viewBox="0 0 24 24" aria-hidden="true">'
            '<path d="M6 9l6 6 6-6"/></svg></summary>'
            f'<div class="faq-body"><p>{item["a"]}</p></div></details>'
        )
    return "\n".join(out)


def strip_tags(s: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", s))


def json_ld(t: dict, lang: str, url: str, links: dict, base_url: str) -> str:
    app = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Streamlity",
        "description": t["meta_description"],
        "applicationCategory": "MultimediaApplication",
        "operatingSystem": "Windows 10, Windows 11, macOS 12+, Linux",
        "softwareVersion": VERSION,
        "license": "https://www.gnu.org/licenses/gpl-3.0.html",
        "url": url,
        "downloadUrl": links["releases"],
        "image": base_url + "assets/img/og.png",
        "inLanguage": lang,
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"},
    }
    faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": strip_tags(i["q"]),
                "acceptedAnswer": {"@type": "Answer", "text": strip_tags(i["a"])},
            }
            for i in t["faq"]
        ],
    }
    return "\n".join(
        f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False)}</script>'
        for d in (app, faq)
    )


def render(template: str, values: dict) -> str:
    def sub(m):
        key = m.group(1)
        if key not in values:
            raise KeyError(f"missing string: {key}")
        return str(values[key])

    return re.sub(r"\{\{\s*([\w.]+)\s*\}\}", sub, template)


def build(base: str) -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(SRC / "assets", DIST / "assets")
    for name in ("styles.css", "main.js"):
        shutil.copy(SRC / name, DIST / "assets" / name)
    shutil.copy(SRC / "assets" / "img" / "favicon.ico", DIST / "favicon.ico")

    base_url = SITE_ORIGIN + base
    template = (SRC / "index.html").read_text(encoding="utf-8")
    strings = {l: json.loads((SRC / "i18n" / f"{l}.json").read_text(encoding="utf-8")) for l in LANGS}
    links = downloads(VERSION)

    alternates = "\n".join(
        f'<link rel="alternate" hreflang="{l}" href="{base_url}{page_path(l)}">' for l in LANGS
    ) + f'\n<link rel="alternate" hreflang="x-default" href="{base_url}">'

    for lang in LANGS:
        t = strings[lang]
        url = base_url + page_path(lang)
        other = [l for l in LANGS if l != lang][0]
        values = {
            **{k: v.replace("{version}", VERSION) for k, v in t.items() if isinstance(v, str)},
            **links,
            "lang": lang,
            "dir": "ltr",
            "base": base,
            "home": base + page_path(lang),
            "url": url,
            "og_image": base_url + "assets/img/og.png",
            "alternates": alternates,
            "other_lang": other,
            "other_url": base + page_path(other),
            "other_lang_name": strings[other]["lang_name"],
            "version": VERSION,
            "store_hidden": "" if STORE_URL else "hidden",
            "store_url": STORE_URL or "#",
            "faq_html": faq_html(t["faq"]),
            "demo_json": html.escape(json.dumps(t["demo"], ensure_ascii=False), quote=True),
            "json_ld": json_ld(t, lang, url, links, base_url),
            "year": str(date.today().year),
        }
        out = DIST / page_path(lang) / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render(template, values), encoding="utf-8")

    t = strings[LANGS[0]]
    not_found = (SRC / "404.html").read_text(encoding="utf-8")
    (DIST / "404.html").write_text(render(not_found, {"base": base}), encoding="utf-8")

    today = date.today().isoformat()
    urls = []
    for lang in LANGS:
        alts = "".join(
            f'\n    <xhtml:link rel="alternate" hreflang="{l}" href="{base_url}{page_path(l)}"/>' for l in LANGS
        )
        urls.append(
            f"  <url>\n    <loc>{base_url}{page_path(lang)}</loc>\n    <lastmod>{today}</lastmod>{alts}\n  </url>"
        )
    (DIST / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
        'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(urls) + "\n</urlset>\n",
        encoding="utf-8",
    )
    (DIST / "robots.txt").write_text(
        f"User-agent: *\nAllow: /\n\nSitemap: {base_url}sitemap.xml\n", encoding="utf-8"
    )
    # Search Console verification files (googleXXXX.html) go in src/verify/.
    verify = SRC / "verify"
    if verify.exists():
        for f in verify.iterdir():
            shutil.copy(f, DIST / f.name)
    (DIST / ".nojekyll").write_text("", encoding="utf-8")
    print(f"built {', '.join(LANGS)} into {DIST} (base {base})")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--base", default=BASE)
    a = p.parse_args()
    base = a.base if a.base.endswith("/") else a.base + "/"
    build(base)
