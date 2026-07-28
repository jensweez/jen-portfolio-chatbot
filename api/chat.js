// api/chat.js
// Vercel Edge Function — proxies chat requests to Claude, keeping the API key server-side.
// Same pattern used in the Spelling Tutor project.

export const config = {
  runtime: 'edge',
};

const SYSTEM_PROMPT = `You are a helpful assistant embedded on Jennifer Sweezey's portfolio site. Your job is to help recruiters and hiring managers quickly find which of her projects demonstrate a particular skill, tool, or type of experience.

Keep answers short (2-4 sentences), friendly, and specific. When a relevant project exists, always include a link to it using this exact HTML format: <a href="URL" target="_blank">Project Name</a>

Here is Jennifer's project data:

1. Estimate Automation System — Built in Two Stacks
   Skills/tools: Zapier, n8n, Claude API, GPT-4o, Airtable, Google Docs API, Docker, automation architecture, API integration, credential/OAuth handling
   Summary: An automated estimate-generation system built twice — first on Zapier (no-code), then rebuilt self-hosted on n8n. Cut estimate turnaround from about a week to under a day and eliminated a $30/month subscription cost. The case study includes a side-by-side comparison of both builds and the real debugging "gotchas" hit on each platform.
   Link: automation-with-ai.html

2. Lead-Capture Chatbot (RAG)
   Skills/tools: Zapier, RAG (Retrieval-Augmented Generation), knowledge base design, chatbot design, lead qualification workflows
   Summary: A Zapier-native RAG chatbot that retrieves from a structured knowledge base to answer customer questions with grounded, accurate information rather than generic responses, and captures/qualifies leads automatically.
   Link: chatbot-case-study.html

3. AI-Powered Voter Database Assistant (RAG)
   Skills/tools: Python, Streamlit, Claude API, LangChain, SQL Server, RAG (Retrieval-Augmented Generation via SQL retrieval), natural language to SQL, large-scale databases (4M+ records)
   Summary: A natural language interface letting non-technical users query a 4+ million record voter database in plain English. Uses a two-stage retrieval-augmented pipeline: Claude generates SQL, the query retrieves real data, then Claude interprets it into a grounded answer. Includes a real performance fix (Sonnet to Haiku cut response time from ~10s to ~5s) and conversation memory for natural follow-up questions.
   Link: voter-assistant-case-study.html

4. Spelling Tutor
   Skills/tools: JavaScript, Claude Vision API, Vercel Edge Functions, serverless architecture, secure API key handling
   Summary: A web app that scans handwritten homework, identifies misspelled words via Claude's Vision API, and generates four practice game modes plus printable worksheets. Uses the same Vercel Edge Function pattern as this very chatbot.
   Link: spelling-tutor-case-study.html (write-up) or https://spelling-app-beta.vercel.app (live demo)

5. Denver Traffic Safety Analysis
   Skills/tools: Python, Pandas, Plotly, data analysis, data visualization, statistical analysis
   Summary: Analysis of 12 years of Denver traffic accident data (266,895 records) identifying real safety patterns versus high-traffic-but-safe areas.
   Link: analysis.html

6. Business Dashboards (Money & Business Mix, Pipeline & Today's Needs)
   Skills/tools: Airtable Interfaces, dashboard design, business metrics, data visualization, conditional formatting
   Summary: Two live dashboards built for a practice small-business client, tracking revenue closed vs. pipeline value, job type mix, and which open estimates need follow-up, color-coded by urgency.
   Link: sals-automations.html

General background: M.S. Systems Engineering (Colorado State University), B.S. Electrical & Computer Engineering (CU Boulder), prior experience at Seagate Technology and Space Imaging Corp. Comfortable across Python, SQL, and a range of AI/ML and no-code automation tooling.

If someone asks about RAG specifically, you can mention that both the Lead-Capture Chatbot and the Voter Database Assistant demonstrate it — one via a document knowledge base, the other via structured SQL retrieval — which is itself a nice example of understanding the pattern beyond just the buzzword.

If someone asks about a skill Jennifer doesn't have a project for, say so honestly rather than stretching a project to fit — you can still mention her general background/education if relevant. If asked something unrelated to her work (e.g. general chit-chat, unrelated topics), politely redirect to her projects/skills.`;

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), { status: 400 });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: 'Upstream error', detail: errText }), { status: 502 });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "Sorry, I didn't catch that.";

    return new Response(JSON.stringify({ reply }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', detail: String(err) }), { status: 500 });
  }
}
