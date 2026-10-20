"""Compare parsed page markup, allowing only declared museum branding and navigation changes."""

import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit


class Canonical(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tokens: list[tuple[object, ...]] = []
        self.skip = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "aside" and a.get("class") == "trial-notice":
            self.skip = 1
            return
        if self.skip:
            if tag not in ["img", "br", "input", "meta", "link"]:
                self.skip += 1
            return
        if tag == "link" and a.get("href") == "/layout.css":
            return
        if tag == "meta" and a.get("name") == "trial-revision":
            return
        for key in ["src", "href"]:
            value = a.get(key)
            if not value:
                continue
            value = value.replace(
                "https://maries-albion-scrapbook.stevehill1981.chatgpt.site/", "/", 1
            )
            parsed = urlsplit(value)
            if not parsed.scheme and not parsed.netloc and parsed.path:
                path = "/" + parsed.path.lstrip("/")
                if key == "href" and path.endswith(".html"):
                    path = path[:-5]
                if path == "/index":
                    path = "/"
                value = urlunsplit(("", "", path, parsed.query, parsed.fragment))
            a[key] = value
        self.tokens.append(("open", tag, sorted(a.items())))

    def handle_endtag(self, tag: str) -> None:
        if self.skip:
            self.skip -= 1
            return
        self.tokens.append(("close", tag))

    def handle_data(self, data: str) -> None:
        if self.skip:
            return
        t = re.sub(r"\s+", " ", data).strip()
        if t:
            self.tokens.append(("text", t))


def tokens(html: str) -> list[tuple[object, ...]]:
    p = Canonical()
    p.feed(html)
    return p.tokens


if __name__ == "__main__":
    baseline = Path("test/fixtures/songs-before-blocks.html").read_text()
    original = json.loads(Path("plans/origins.json").read_text())["firstFactOriginal"]
    baseline = baseline.replace("<!-- EDITABLE_FACT -->", original)
    # Explicitly authorised identity/navigation changes; historical body stays exact.
    baseline = baseline.replace("THE ALBION<br><small>THROUGH THE YEARS</small>",
                                "THROSTLE<br><small>&amp; STRIPES</small>")
    baseline = baseline.replace('<a href="#">Back to the top ↑</a>',
        '<div><a href="/pages">Pages &amp; collections</a><br>'
        '<a href="/publication.html">Marie’s editing guide</a> · '
        '<a href="/admin/">Editor</a><br><a href="#">Back to the top ↑</a></div>')
    expected = tokens(baseline)
    actual = tokens(Path(sys.argv[1]).read_text())
    if actual != expected:
        for i, (a, b) in enumerate(zip(actual, expected)):
            if a != b:
                raise AssertionError(
                    f"Parsed page diverged at token {i}: actual={a!r}; expected={b!r}"
                )
        raise AssertionError(
            f"Token counts differ: actual={len(actual)}, expected={len(expected)}"
        )
    assert len(expected) > 1000
    print(
        f"PASS: {len(expected)} parsed markup/text tokens preserve the original Songs page, including all source URLs and credits."
    )
