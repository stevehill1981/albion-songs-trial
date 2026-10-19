"""One-time, dependency-free extraction from the retained migration fixture."""

from __future__ import annotations

import json
from collections.abc import Iterable
from html.parser import HTMLParser
from pathlib import Path


class Node:
    def __init__(
        self, tag: str = "", attrs: Iterable[tuple[str, str | None]] = ()
    ) -> None:
        self.tag, self.attrs, self.children = tag, dict(attrs), []

    def all(self, tag: str) -> list[Node]:
        return [n for n in self.children if isinstance(n, Node) and n.tag == tag]

    def find(self, **attrs: str) -> Node | None:
        if all(self.attrs.get(k) == v for k, v in attrs.items()):
            return self
        for n in self.children:
            if isinstance(n, Node):
                found = n.find(**attrs)
                if found:
                    return found

    def text(self) -> str:
        return "".join(n.text() if isinstance(n, Node) else n for n in self.children)


class Parser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        n = Node(tag, attrs)
        self.stack[-1].children.append(n)
        if tag not in ["meta", "link", "img", "input", "br", "hr"]:
            self.stack.append(n)

    def handle_endtag(self, tag: str) -> None:
        assert self.stack[-1].tag == tag, tag
        self.stack.pop()

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


def parts(n: Node) -> list[dict[str, str]]:
    out = []
    for child in n.children:
        if isinstance(child, str):
            if child:
                out.append({"type": "text", "text": child})
        else:
            kind = {"em": "emphasis", "strong": "strong", "a": "link"}.get(child.tag)
            assert kind, child.tag
            entry = {"type": kind, "text": child.text()}
            if kind == "link":
                entry["url"] = child.attrs["href"]
            out.append(entry)
    return out


def paragraphs(n: Node) -> list[dict[str, object]]:
    return [{"parts": parts(p)} for p in n.all("p")]


def sources(n: Node) -> list[dict[str, str]]:
    return [{"label": a.text(), "url": a.attrs["href"]} for a in n.all("a")]


def title(n: Node) -> str:
    return "".join(
        "\n"
        if isinstance(c, Node) and c.tag == "br"
        else c.text()
        if isinstance(c, Node)
        else c
        for c in n.children
    )


def fact(n: Node) -> dict[str, str]:
    return {
        "title": n.all("h3")[0].text(),
        "text": n.all("p")[0].text(),
        "sourceURL": n.all("a")[0].attrs["href"],
        "sourceLabel": n.all("a")[0].text(),
    }


if Path("content/pages/songs.json").exists():
    raise SystemExit(
        "Extraction already completed. Do not overwrite editorial content; use the retained fixture for comparisons."
    )

p = Parser()
raw = Path("test/fixtures/songs-before-blocks.html").read_text()
p.feed(raw)
root = p.root
main = root.find(id="main")
intro = main.all("section")[0]
wrap = intro.all("div")[0]
layout = wrap.all("div")[0]
hero = layout.all("div")[0]
figure = layout.all("figure")[0]
blocks = [
    {
        "type": "intro",
        "heading": title(hero.all("h1")[0]),
        "emphasiseLastLine": True,
        "text": title(hero.all("p")[0]),
        "buttonLabel": hero.all("a")[0].text(),
        "imageAlt": figure.all("img")[0].attrs["alt"],
        "caption": parts(figure.all("figcaption")[0]),
    }
]
b = root.find(id="boing")
prose, accounts = b.all("div")
blocks.append(
    {
        "type": "story",
        "anchor": "boing",
        "navLabel": "Why Boing Boing?",
        "heading": title(prose.all("h2")[0]),
        "deck": prose.all("p")[0].text(),
        "paragraphs": paragraphs(prose)[1:],
        "sources": sources(prose),
        "accountsHeading": accounts.all("h3")[0].text(),
        "accounts": [
            {"title": n.all("summary")[0].text(), "paragraphs": paragraphs(n)}
            for n in accounts.all("details")
        ],
        "accountsSources": sources(accounts),
    }
)
b = root.find(id="shepherd").all("div")[0]
head = b.find(**{"class": "hymn-heading"}).all("div")[0]
footage = b.find(id="footage-1976")
blocks.append(
    {
        "type": "accounts",
        "anchor": "shepherd",
        "navLabel": "Why the hymn?",
        "heading": title(head.all("h2")[0]),
        "emphasiseLastLine": True,
        "deck": head.all("p")[0].text(),
        "accounts": [
            {
                "title": a.all("h3")[0].text(),
                "paragraphs": paragraphs(a),
                "sources": sources(a),
            }
            for a in b.find(**{"class": "hymn-accounts"}).all("article")
        ],
        "footageHeading": footage.all("h3")[0].text(),
        "footageIntro": parts(footage.all("p")[0]),
        "footageLinks": [{"parts": parts(n)} for n in footage.all("ul")[0].all("li")],
        "footageNotice": parts(footage.all("p")[1]),
        "conclusion": b.find(**{"class": "hymn-conclusion"}).text(),
    }
)
b = root.find(id="songbook")
head = b.find(**{"class": "section-heading"}).all("div")[0]
songs = []
for n in b.find(id="song-list").all("article"):
    d, r = n.all("div")
    a = r.all("a")[0]
    songs.append(
        {
            "title": d.all("h3")[0].text(),
            "text": d.all("p")[0].text(),
            "category": n.attrs["data-category"],
            "sourceURL": a.attrs["href"],
            "sourceLabel": a.children[0],
        }
    )
blocks.append(
    {
        "type": "songbook",
        "anchor": "songbook",
        "navLabel": "The songbook",
        "heading": title(head.all("h2")[0]),
        "deck": head.all("p")[0].text(),
        "scope": b.find(**{"class": "songbook-scope"}).text(),
        "songs": songs,
        "more": parts(b.find(**{"class": "songbook-more"})),
    }
)
b = root.find(id="liquidator").all("div")[0]
head = b.find(**{"class": "section-heading"}).all("div")[0]
notes = b.find(**{"class": "liquidator-open"})
checks = []
for n in notes.children:
    if isinstance(n, Node) and n.tag == "p":
        checks.append({"type": "paragraph", "parts": parts(n)})
    if isinstance(n, Node) and n.tag == "h3":
        checks.append({"type": "heading", "text": n.text()})
blocks.append(
    {
        "type": "timeline",
        "anchor": "liquidator",
        "navLabel": "The Liquidator",
        "heading": title(head.all("h2")[0]),
        "deck": head.all("p")[0].text(),
        "paragraphs": paragraphs(b.find(**{"class": "liquidator-intro"})),
        "factsLinkLabel": b.find(**{"class": "liquidator-intro"}).all("a")[0].text(),
        "events": [
            {
                "date": n.all("div")[0].text(),
                "title": n.all("div")[1].all("h3")[0].text(),
                "text": n.all("div")[1].all("p")[0].text(),
                "sources": sources(n.all("div")[1]),
            }
            for n in b.find(**{"class": "liquidator-timeline"}).all("li")
        ],
        "checksHeading": notes.all("summary")[0].text(),
        "checks": checks,
    }
)
b = root.find(id="terrace-facts")
blocks.append(
    {
        "type": "facts",
        "anchor": "terrace-facts",
        "navLabel": "",
        "heading": b.find(**{"class": "fact-body"}).all("h2")[0].text(),
        "imageAlt": b.find(**{"class": "baggie-illustration"}).attrs["alt"],
        "includeBlueVinyl": True,
        "facts": [fact(n) for n in b.find(**{"class": "fact-body"}).all("article")],
    }
)
b = main.find(**{"class": "wrap section songs-close"})
notes = b.all("details")[0]
blocks.append(
    {
        "type": "closing",
        "anchor": "closing",
        "navLabel": "",
        "heading": title(b.all("h2")[0]),
        "text": b.all("p")[0].text(),
        "linkLabel": b.all("a")[0].text(),
        "linkURL": b.all("a")[0].attrs["href"],
        "notesHeading": notes.all("summary")[0].text(),
        "notes": paragraphs(notes),
    }
)
page = {
    "slug": "songs",
    "title": "Songs & terrace culture — Albion, through the years",
    "description": "Why do Albion fans Boing Boing? Why The Lord’s My Shepherd? Explore the stories, disputed origins and a sourced Albion songbook.",
    "collections": ["terrace-culture"],
    "blocks": blocks,
}
Path("content/pages/songs.json").write_text(
    json.dumps(page, ensure_ascii=False, indent=2) + "\n"
)
Path("content/collections/terrace-culture.json").write_text(
    json.dumps(
        {
            "slug": "terrace-culture",
            "title": "Songs & terrace culture",
            "description": "Albion’s songs, music and supporter traditions.",
        },
        ensure_ascii=False,
        indent=2,
    )
    + "\n"
)
pre, rest = raw.split('<main id="main">')
_, post = rest.split("</main>")
shell = pre + '<main id="main"><!-- PAGE_CONTENT --></main>' + post
Path("legacy/shell.html").write_text(shell)
assert len(songs) == 43 and len(blocks) == 7
print(
    "Extracted seven reusable blocks, 43 songs, five facts plus the existing shared fact, and one collection."
)
