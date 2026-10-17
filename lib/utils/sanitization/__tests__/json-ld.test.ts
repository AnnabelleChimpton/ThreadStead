import { serializeJsonLd } from "../json-ld";

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

describe("serializeJsonLd", () => {
  it("prevents a </script> breakout from user-controlled strings", () => {
    // The real vector: a ThreadRing name, which reaches structured data
    // unescaped from Ring Hub (no charset restriction on either side).
    const payload = '</script><img src=x onerror="alert(1)">';
    const out = serializeJsonLd({ "@type": "Organization", name: payload });

    expect(out).not.toContain("</script");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("<");
  });

  it("survives case-variant and whitespace-padded closing tags", () => {
    const out = serializeJsonLd({ name: "</ScRiPt >< SCRIPT>" });
    expect(out.toLowerCase()).not.toContain("</script");
    expect(out).not.toContain("<");
  });

  it("escapes the HTML comment opener", () => {
    const out = serializeJsonLd({ name: "<!--<script>" });
    expect(out).not.toContain("<!--");
    expect(out).not.toContain("<");
  });

  it("escapes raw JS line terminators that break JSON-LD consumers", () => {
    const out = serializeJsonLd({ name: `a${LINE_SEPARATOR}b${PARAGRAPH_SEPARATOR}c` });

    expect(out).not.toContain(LINE_SEPARATOR);
    expect(out).not.toContain(PARAGRAPH_SEPARATOR);
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
  });

  it("round-trips to an identical object, so crawlers see no difference", () => {
    const data = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: '</script><img src=x> & "quoted" <b>bold</b>',
      description: `line${LINE_SEPARATOR}break`,
      memberCount: 42,
      nested: { founder: { name: "a & b <c>" } },
    };

    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("leaves ordinary text untouched apart from the escaped set", () => {
    const data = { name: "Cats & Dogs", description: "A ring for pets" };
    const parsed = JSON.parse(serializeJsonLd(data));

    expect(parsed.name).toBe("Cats & Dogs");
    expect(parsed.description).toBe("A ring for pets");
  });

  it("handles null and undefined without emitting bare undefined", () => {
    expect(serializeJsonLd(null)).toBe("null");
    expect(serializeJsonLd(undefined)).toBe("null");
  });
});
