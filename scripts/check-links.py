"""Check emitted local links and assets, including fail-capable controls."""

from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1] / "build"


class Page(HTMLParser):
    def __init__(self, markup: str) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.links: list[str] = []
        self.feed(markup)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if values.get("id"):
            self.ids.append(values["id"])
        for name in ("href", "src"):
            if values.get(name):
                self.links.append(values[name])


def verify(pages: dict[Path, Page]) -> None:
    checked = 0
    for path, page in pages.items():
        duplicates = [key for key, count in Counter(page.ids).items() if count > 1]
        assert not duplicates, f"Duplicate IDs in {path}: {duplicates}"
        base = "/" + path.relative_to(ROOT).as_posix()
        for link in page.links:
            parsed = urlsplit(urljoin("https://museum.invalid" + base, link))
            if parsed.netloc != "museum.invalid" or parsed.scheme != "https":
                continue
            target = ROOT / unquote(parsed.path).lstrip("/")
            if target.is_dir():
                target /= "index.html"
            elif not target.is_file() and not target.suffix:
                target = target.with_suffix(".html")
            assert target.is_file(), f"Missing local target in {path}: {link}"
            if parsed.fragment and target.suffix == ".html" and target in pages:
                assert unquote(parsed.fragment) in pages[target].ids, (
                    f"Missing anchor in {path}: {link}"
                )
            checked += 1
    assert checked > 100, "No meaningful local link coverage"


def main() -> None:
    pages = {
        path: Page(path.read_text())
        for path in ROOT.rglob("*.html")
        if not {"admin", "editor-check"}.intersection(path.relative_to(ROOT).parts)
    }
    verify(pages)
    home = ROOT / "index.html"
    original = pages[home]
    for markup in (
        '<a href="/missing-local-check-target">broken</a>',
        '<a href="/#missing-local-check-anchor">broken</a>',
        '<div id="negative-duplicate"></div><div id="negative-duplicate"></div>',
    ):
        pages[home] = Page(home.read_text() + markup)
        try:
            verify(pages)
        except AssertionError:
            pass
        else:
            raise AssertionError("Negative control unexpectedly passed")
    pages[home] = original
    print(
        f"PASS: {len(pages)} emitted pages have unique IDs and resolving local links/assets; three negative controls rejected."
    )


if __name__ == "__main__":
    main()
