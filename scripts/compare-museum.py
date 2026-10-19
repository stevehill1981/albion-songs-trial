"""One-time migration comparison; future editorial changes are not pinned to this fixture."""

import sys
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path

spec = spec_from_file_location(
    "compare_songs", Path(__file__).with_name("compare-songs.py")
)
assert spec and spec.loader
module = module_from_spec(spec)
spec.loader.exec_module(module)
Canonical = module.Canonical


class MuseumCanonical(Canonical):
    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "script" and values.get("id") == "quiz-data":
            self.skip = 1
            return
        if tag == "link" and values.get("href") == "/layout.css":
            return
        super().handle_starttag(tag, attrs)


def tokens(raw: str) -> list[tuple[object, ...]]:
    p = MuseumCanonical()
    p.feed(raw)
    return p.tokens


if __name__ == "__main__":
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("build")
    for name in ["index", "hawthorns", "results", "wartime"]:
        expected = tokens(Path(f"test/fixtures/museum/{name}.html").read_text())
        actual = tokens((output / f"{name}.html").read_text())
        if actual != expected:
            for i, (a, b) in enumerate(zip(actual, expected)):
                if a != b:
                    raise AssertionError(
                        f"{name} token {i}: actual={a!r}; expected={b!r}"
                    )
            raise AssertionError(
                f"{name} token counts: {len(actual)} != {len(expected)}"
            )
        assert len(expected) > 100
        print(f"PASS: {name}: {len(expected)} original markup/text tokens preserved.")
