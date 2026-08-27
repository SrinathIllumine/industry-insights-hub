import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  raw: z.string().min(1).max(200000),
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
    "revenueCagr": "string e.g. 14.2%",
    "industryCagr": "string e.g. 9.0%",
    "verdict": "one of the allowed financial tags",
    "verdictNote": "one short sentence justifying the verdict",
    "benchmarkImageUrl": "https URL of a chart image if present in the input, else empty string",
    "benchmarkNote": "short note on where the company stands in the industry"
  },
  "challenges": [
    { "theme": "one of the allowed themes", "problem": "the actual problem", "quote": "stakeholder quote or empty", "quoteBy": "role of the person or empty", "tag": "one of the allowed challenge tags" }
  ],
  "verticals": [
    {
      "name": "BU name",
      "description": "one-liner",
      "basicDetails": "short bullet-ish text",
      "revenueDetails": "revenue and share",
      "stakeholders": ["one readable bullet per stakeholder or group, include role/context and any numbers"],
      "engagementModel": ["one readable bullet per channel / step of the channel engagement model, keep numbers legible"],
      "contributions": [
        { "model": "one of the allowed Illumine models, or a new short model name", "configuration": "how this model could be configured for this company" }
      ]
    }
  ],
  "initiatives": [
    { "area": "", "category": "", "initiative": "", "whatItDoes": "", "howItIsDone": "" }
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

    const system = `You convert messy company research notes (markdown dumps, pasted tables, bullet notes) into a strict JSON company research profile.
Return ONLY JSON matching this shape, no markdown fences:
${PROFILE_SHAPE}

Rules:
- Use only information present in the input. Leave fields as empty strings or empty arrays when unknown. Never invent numbers.
- "grades" express how good each financial figure is: "good" (healthy/growing), "warn" (flat/mild concern), "bad" (loss/decline), "none" (no basis).
- Each metric's values and grades arrays must have exactly the same length as "years".
- Allowed challenge themes (pick the closest one, never invent new): ${data.themes.join(" | ") || "(none configured)"}
- Allowed challenge tags: ${data.challengeTags.join(" | ") || "(none configured)"}
- Allowed financial verdict tags: ${data.financialTags.join(" | ") || "(none configured)"}
- Allowed Illumine models for vertical contributions (prefer these, but a new short model name is allowed): ${data.illumineModels.join(" | ") || "(none configured)"}
- "stakeholders" and "engagementModel" must be arrays of short readable bullet strings, never a single blob.`;

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
