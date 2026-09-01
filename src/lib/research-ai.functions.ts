import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  raw: z.string().min(1).max(1_200_000),
  companyName: z.string().max(200).default(""),
  themes: z.array(z.string()).default([]),
  challengeTags: z.array(z.string()).default([]),
  financialTags: z.array(z.string()).default([]),
  illumineModels: z.array(z.string()).default([]),
});

const PROFILE_SHAPE = `{
  "financials": {
    "unit": "string, e.g. INR Cr or USD M",
    "years": ["FY24","FY25","FY26"],
    "metrics": [
      { "name": "Revenue", "values": ["...","...","..."], "grades": ["good|warn|bad|none", "...", "..."] },
      { "name": "Net profit / loss", "values": [], "grades": [] },
      { "name": "EBITDA", "values": [], "grades": [] },
      { "name": "PAT", "values": [], "grades": [] }
    ],
    "revenueCagr": "string e.g. 14.2% (company, 5-yr)",
    "industryCagr": "string e.g. 9.0% (industry, 5-yr)",
    "verdict": "one of the allowed financial tags",
    "verdictNote": "one short sentence justifying the verdict",
    "benchmarkImageUrl": "https URL of a chart image if present in the input, else empty string",
    "benchmarkNote": "short note on where the company stands in the industry",
    "charts": [
      { "title": "what the chart shows", "imageUrl": "https URL of a chart/graph image found in the input, else empty", "caption": "1-2 sentences on the STORY this chart tells (trend, inflection, divergence)" }
    ],
    "narrative": "exactly 2 sentences making sense of their financial status AND where they are headed"
  },
  "challenges": [
    {
      "theme": "one of the allowed theme names; if a problem genuinely does not fit any, keep the closest and say so in the problem text",
      "themeExample": "the specific example / business context under that theme this problem represents",
      "mood": "challenge (a problem / threat) or aspiration (a goal / ambition) — read the tone of the content",
      "problem": "a thorough, plain-language explanation (4-8 sentences) that ANY reader can understand: what is actually happening, why it exists, what is at stake, how it is playing out, and the leadership response",
      "status": "one short line — where this stands right now (e.g. 'Actively defending; share recovering from 36% to 46%')",
      "quotes": [
        { "text": "VERBATIM quote from the input, directly about THIS problem", "by": "name / role of the speaker", "sourceLabel": "publication", "sourceUrl": "https URL for this quote" }
      ],
      "tag": "one of the allowed challenge tags",
      "sources": [ { "label": "publication / doc name", "url": "https URL a key claim was pulled from" } ]
    }
  ],
  "verticalsNote": "optional framing note about how the verticals are defined / what is / isn't a standard BU",
  "verticalsImageCaption": "1-2 sentences on what a group-level revenue-split / segment-mix chart shows (the app attaches the image)",
  "verticals": [
    {
      "name": "BU / vertical name",
      "description": "one-liner",
      "basicDetails": "short bullet-ish text",
      "shareOfRevenue": "e.g. ~20% of group revenue",
      "revenueDetails": "the sub-line detail, e.g. 'FY2025-26 revenue, consolidated · PAT INR 3,030 cr · 4,35,227 units sold'",
      "revenueValue": "headline revenue figure for this vertical, e.g. INR 83,855 cr",
      "revenueGrowth": "growth, e.g. +12% YoY or 3-yr CAGR 9%",
      "revenueInsight": "the non-obvious insight about what really drives this vertical's revenue (2-4 sentences)",
      "revenueContributors": [ { "name": "product / service / element", "detail": "share or value or why it matters" } ],
      "mixChartCaption": "1-2 sentences on what a product/volume/revenue mix chart for this vertical shows (leave imageUrl-type fields out; the app attaches the image)",
      "channelModelName": "e.g. Dealer Franchise Model (dominant channel)",
      "stakeholders": [
        { "name": "", "role": "designation / what they decide", "hierarchy": "where they sit in the org, e.g. 'Reports to Group CEO'", "educationUG": "undergrad degree & institute if stated", "educationPG": "postgrad degree & institute if stated", "experienceCurrent": "current mandate", "experiencePrevious": "prior roles & companies" }
      ],
      "engagementModel": ["one bullet per step / mechanism of how the channel engagement works"],
      "channelStats": [ { "label": "e.g. Dealers / Dealer sales executives per dealership / Company sales & commercial workforce / Retail outlets", "value": "the number incl. any 'est.'/'confirmed' qualifier, e.g. ~750 est." } ],
      "channelMethodology": "the methodology paragraph explaining how estimated numbers were derived, if present",
      "dealerChannelTypes": ["type of dealer or channel active in this vertical"],
      "contributions": [
        { "stakeholders": "the stakeholder(s) involved, or the engagement between stakeholders — e.g. 'Sales & service associates'", "model": "one of the allowed Illumine models, or a new short model name", "whatHappens": "what happens in this engagement" }
      ]
    }
  ],
  "initiatives": [
    { "year": "year the initiative was introduced, if stated", "area": "", "category": "", "initiative": "", "whatItDoes": "", "howItIsDone": "" }
  ],
  "partnerContributions": [
    { "date": "e.g. Mar 2025", "stage": "e.g. Initial conversation", "title": "", "description": "" }
  ]
}`;

export const structureResearchDump = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, error: "AI is not configured for this project." };
    }

    const system = `You convert messy company research notes (markdown or HTML exports, pasted tables, bullet notes) into a strict JSON company research profile.
Return ONLY JSON matching this shape, no markdown fences:
${PROFILE_SHAPE}

Rules:
- Use only information present in the input. Leave fields as empty strings or empty arrays when unknown. Never invent numbers, quotes or URLs.
- Go DEEP: prefer thorough, insight-rich explanations over terse surface data. The reader is company leadership making decisions.
- The output structure is dynamic: only populate what the input genuinely supports. Sparse input → fewer array items, empty optional fields. Rich input → more contributors, more channelStats, more charts.
- "grades" express how good each financial figure is: "good" (healthy/growing), "warn" (flat/mild concern), "bad" (loss/decline), "none" (no basis).
- Each metric's values and grades arrays must have exactly the same length as "years".
- financials.narrative must be exactly two sentences and must include a forward-looking view.
- challenges[].problem must be a detailed multi-sentence explanation, not a headline.
- challenges[].quotes: include every verbatim quote in the input that is clearly about that same problem (there may be several, or none). Never force-fit a quote to the wrong problem. Attach each quote's own source URL when the input shows one.
- Do NOT put image URLs or data URIs anywhere. The app attaches chart / map / engagement-map images itself — you only write their titles and captions.
- Only include a source if a real URL or named document appears in the input.
- Preserve depth: revenueInsight, channelMethodology and verticalsNote should carry the full nuance from the input, not a summary.
- Allowed challenge theme names (pick the closest one, never invent new): ${data.themes.join(" | ") || "(none configured)"}
- Allowed challenge tags: ${data.challengeTags.join(" | ") || "(none configured)"}
- Allowed Illumine models for vertical contributions (prefer these, but a new short model name is allowed): ${data.illumineModels.join(" | ") || "(none configured)"}
- "engagementModel" and "dealerChannelTypes" must be arrays of short readable bullet strings. "stakeholders" is an array of objects, one per decision-maker.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `Company: ${data.companyName || "(unknown)"}\n\nRaw research input:\n\n${data.raw}`,
          },
        ],
      }),
    });

    if (response.status === 429) {
      return { ok: false as const, error: "Rate limit reached. Please try again in a moment." };
    }
    if (response.status === 402) {
      return { ok: false as const, error: "AI credits exhausted. Please top up to continue." };
    }
    if (!response.ok) {
      console.error("AI gateway error", response.status, await response.text());
      return { ok: false as const, error: "Could not structure the data. Please try again." };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const cleaned = content
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) {
      return { ok: false as const, error: "The AI response could not be read as a profile." };
    }
    try {
      return { ok: true as const, profile: JSON.parse(cleaned.slice(start, end + 1)) as unknown };
    } catch {
      return { ok: false as const, error: "The AI response could not be read as a profile." };
    }
  });
