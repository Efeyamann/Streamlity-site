# Streamlity website

Source of the website for [Streamlity](https://github.com/Efeyamann/Streamlity),
a free, open-source IPTV player for Windows, macOS and Linux.

Live at <https://efeyamann.github.io/Streamlity-site/>.

## Build

Needs only Python 3.

```bash
python build.py            # production build into dist/
python build.py --base /   # local preview
python -m http.server -d dist
```

- `src/index.html` is the page template; `{{key}}` placeholders are filled from
  `src/i18n/<lang>.json`. English is served at the root, other languages under `/<lang>/`.
- To add a language, add its JSON file and the code to `LANGS` in `build.py`.
- `build.py` also writes `sitemap.xml`, `robots.txt` and `404.html`.
- Search Console verification files (`google….html`) go in `src/verify/`.
- After a new app release, update `VERSION` in `build.py`.

Pushing to `main` deploys the site with GitHub Pages (`.github/workflows/pages.yml`).

Inter font: SIL Open Font License (`src/assets/fonts/Inter-LICENSE.txt`).
Content © Streamlity contributors.
