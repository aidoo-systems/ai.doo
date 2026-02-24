import os
from flask import Flask, request, jsonify
from openai import OpenAI

app = Flask(__name__)

SYSTEM_PROMPT = """You are a helpful assistant for ai.doo (aidoo.biz), a private-first AI products and bespoke solutions company based on the Isle of Man.

Key facts about ai.doo:
- Builds private, self-hosted AI products and extends them into bespoke solutions for real environments
- Core principle: customer data never leaves their own infrastructure
- Contact: hello@aidoo.biz

PIKA — ai.doo's flagship product:
- Self-hosted document intelligence application
- Upload, index, and query internal documents using local AI models
- No data ever sent to external servers; runs entirely within the customer's infrastructure
- Designed to be deployed within an organisation's own infrastructure — not a cloud service
- Features: RAG (retrieval-augmented generation), citations, access control, document Q&A
- Changelog at aidoo.biz/pika/changelog

How we work — four steps:
1. Discover & define: Free initial call, align on use case, data sensitivity, and success criteria
2. Pilot in your environment: Deploy where your data lives — see real behaviour, not a deck
3. Harden for production: Configuration, monitoring, performance tuning, documentation
4. Extend where needed: Bespoke features and integrations on top of the product foundation

Engagement models / pricing:
- Discovery: Free initial call, no obligation — 30-60 minutes to understand your environment and goals
- Pilot: Fixed scope, measurable outcome, pricing on request — email hello@aidoo.biz
- Production: Full build, documentation, and ongoing support — custom scope agreed after pilot

Keep answers concise and helpful. If asked about specific pricing figures, explain that pricing is on request and suggest emailing hello@aidoo.biz. Do not speculate about features or capabilities not described above."""


@app.after_request
def add_cors(response):
    origin = request.headers.get("Origin", "")
    if origin in ("https://aidoo.biz", "https://www.aidoo.biz"):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


@app.route("/api/chat", methods=["OPTIONS"])
def chat_preflight():
    return "", 204


@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True)
    if not data or not isinstance(data.get("message"), str):
        return jsonify({"error": "Missing message"}), 400

    message = data["message"].strip()
    if not message:
        return jsonify({"error": "Empty message"}), 400
    if len(message) > 1000:
        return jsonify({"error": "Message too long"}), 400

    client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

    completion = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=500,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
    )

    reply = completion.choices[0].message.content
    return jsonify({"reply": reply})
