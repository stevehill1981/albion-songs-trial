"""Extract published page sections into safe text/link slots and fixed templates."""

import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

VOID = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}


class Node:
    def __init__(
        self,
        tag: str,
        attrs: list[tuple[str, str | None]],
        start: int,
        end: int,
        parent: "Node | None",
    ) -> None:
        self.tag, self.attrs, self.start, self.end, self.parent = (
            tag,
            dict(attrs),
            start,
            end,
            parent,
        )
        self.children: list[Node] = []


class Parser(HTMLParser):
    def __init__(self, raw: str) -> None:
        super().__init__(convert_charrefs=False)
        self.raw = raw
        self.lines = [0]
        for m in re.finditer("\n", raw):
            self.lines.append(m.end())
        self.root = Node("", [], 0, len(raw), None)
        self.stack = [self.root]
        self.texts: list[tuple[int, int, str, Node]] = []

    def pos(self) -> int:
        line, col = self.getpos()
        return self.lines[line - 1] + col

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        start = self.pos()
        n = Node(
            tag, attrs, start, start + len(self.get_starttag_text()), self.stack[-1]
        )
        self.stack[-1].children.append(n)
        if tag not in VOID:
            self.stack.append(n)

    def handle_endtag(self, tag: str) -> None:
        assert self.stack[-1].tag == tag, (tag, self.stack[-1].tag)
        self.stack[-1].end = self.pos() + len(tag) + 3
        self.stack.pop()

    def handle_data(self, data: str) -> None:
        self.texts.append((self.pos(), self.pos() + len(data), data, self.stack[-1]))

    def find(self, tag: str) -> Node:
        def walk(n: Node) -> Node | None:
            if n.tag == tag:
                return n
            for c in n.children:
                hit = walk(c)
                if hit:
                    return hit
            return None

        hit = walk(self.root)
        assert hit
        return hit


def normalise(raw: str) -> str:
    raw = raw.replace(
        "https://maries-albion-scrapbook.stevehill1981.chatgpt.site/index.html", "/"
    ).replace("https://maries-albion-scrapbook.stevehill1981.chatgpt.site/", "/")
    return re.sub(
        r'(href|src)="(?!https:|http:|mailto:|#|/)([^"]+)"',
        lambda m: m[1] + '="/' + m[2] + '"',
        raw,
    )


if Path("src/lib/museum-patterns.json").exists():
    raise SystemExit(
        "The museum is already extracted. Do not overwrite editorial content; compare against the retained fixtures instead."
    )

patterns = []
for slug in ["home", "hawthorns", "results", "wartime"]:
    file = "index" if slug == "home" else slug
    raw = normalise(Path(f"test/fixtures/museum/{file}.html").read_text())
    # Credits remain generated from the editable photograph records.
    raw = re.sub(
        r"<!-- COLLECTION CREDITS START -->[\s\S]*?<!-- COLLECTION CREDITS END -->",
        "<!-- PHOTO_CREDITS -->",
        raw,
    )
    p = Parser(raw)
    p.feed(raw)
    main = p.find("main")
    blocks = []
    museum_added = False
    for index, n in enumerate(main.children):
        identifier = n.attrs.get("id", "")
        if slug == "home" and identifier in ["history", "collection", "reading"]:
            if not museum_added:
                blocks.append({"type": "museum", "anchor": "history", "navLabel": ""})
                museum_added = True
            continue
        name = f"{slug}-{identifier or n.tag + '-' + str(index + 1)}"
        label = (
            (slug + " · " + (identifier or n.attrs.get("class") or n.tag))
            .replace("-", " ")
            .title()
        )
        replacements = []
        fields = []
        values = {}
        counter = 0

        def field(
            start: int,
            end: int,
            value: str,
            kind: str,
            label: str,
            fields: list[dict[str, str]] = fields,
            values: dict[str, str] = values,
            replacements: list[tuple[int, int, str]] = replacements,
        ) -> None:
            key = f"field{len(fields) + 1}"
            fields.append({"name": key, "label": label, "kind": kind})
            values[key] = value
            replacements.append((start, end, "{{" + key + "}}"))

        for start, end, data, parent in p.texts:
            if not (n.start <= start < end <= n.end) or not data.strip():
                continue
            ancestors = []
            cur = parent
            while cur:
                ancestors.append(cur)
                cur = cur.parent
            if any(
                x.tag in ["script", "style", "table", "form", "select", "noscript"]
                for x in ancestors
            ):
                continue
            # Computed counts and freshness placeholders are maintained by ledger scripts.
            if any(
                x.attrs.get("id")
                in [
                    "result-summary",
                    "latest-included",
                    "result-status",
                    "wartime-summary",
                    "wartime-status",
                    "feed-status",
                    "latest-wartime",
                    "coverage-check",
                ]
                for x in ancestors
            ):
                continue
            if data.strip() in ["·", "↗", "↓", "↑", "→", "."]:
                continue
            leading = data[: len(data) - len(data.lstrip())]
            trailing = data[len(data.rstrip()) :]
            text = html.unescape(data.strip())
            kind = "text"
            context = (
                "Heading"
                if parent.tag in ["h1", "h2", "h3", "h4", "summary"]
                else "Link label"
                if parent.tag == "a"
                else "Text"
            )
            field(
                start + len(leading),
                end - len(trailing),
                text,
                kind,
                context + " — " + text[:65],
            )

        def attrs(node: Node, raw: str = raw) -> None:
            tag = raw[node.start : raw.find(">", node.start) + 1]
            protected = False
            cur = node
            while cur:
                if cur.tag in ["table", "form", "select"]:
                    protected = True
                cur = cur.parent
            if not protected:
                for m in re.finditer(r'(href|alt)="([^"]*)"', tag):
                    key, value = m[1], html.unescape(m[2])
                    if key == "alt" and not value:
                        continue
                    if key == "href" and value.startswith("#"):
                        continue
                    field(
                        node.start + m.start(2),
                        node.start + m.end(2),
                        value,
                        "link" if key == "href" else "text",
                        "Source or related link"
                        if key == "href"
                        else "Image description",
                    )
            for child in node.children:
                attrs(child)

        attrs(n)
        template = raw[n.start : n.end]
        for start, end, value in sorted(replacements, reverse=True):
            template = template[: start - n.start] + value + template[end - n.start :]
        patterns.append(
            {
                "name": name,
                "label": label,
                "template": template,
                "fields": fields,
                "hero": any(c.tag == "h1" for c in n.children) or "<h1" in template,
            }
        )
        blocks.append({"type": name, **values})
    prefix = raw[: main.start] + raw[main.start : raw.find(">", main.start) + 1]
    suffix = raw[main.end - len("</main>") :]
    prefix = prefix.replace("</body>", "")
    shell = prefix + "<!-- PAGE_CONTENT -->" + suffix
    # A common editing toolbar, separate from preserved museum content.
    shell = shell.replace(
        "<body>",
        '<body><aside class="trial-notice">Museum editing preview · <a href="/admin/">Open the editor</a> · <a href="/pages">Pages &amp; collections</a> · <a href="/publication.html">Publishing help</a></aside>',
    )
    Path(f"legacy/{slug}-shell.html").write_text(shell)
    title = html.unescape(re.search(r"<title>(.*?)</title>", raw, re.DOTALL)[1])
    desc = re.search(r'<meta name="description" content="([^"]*)"', raw)
    page = {
        "slug": slug,
        "title": title,
        "description": html.unescape(desc[1]) if desc else title,
        "collections": [
            "museum-history" if slug in ["home", "hawthorns"] else "match-archives"
        ],
        "blocks": blocks,
    }
    Path(f"content/pages/{slug}.json").write_text(
        json.dumps(page, ensure_ascii=False, indent=2) + "\n"
    )
Path("src/lib/museum-patterns.json").write_text(
    json.dumps(patterns, ensure_ascii=False, indent=2) + "\n"
)
for slug, title, description in [
    (
        "museum-history",
        "Albion history",
        "People, places and objects from Albion’s history.",
    ),
    (
        "match-archives",
        "Match archives",
        "Competitive records, local rivals and the separate wartime archive.",
    ),
]:
    Path(f"content/collections/{slug}.json").write_text(
        json.dumps(
            {"slug": slug, "title": title, "description": description},
            ensure_ascii=False,
            indent=2,
        )
        + "\n"
    )
print(f"Extracted {len(patterns)} preserved section templates across four pages.")
