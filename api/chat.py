import os
import time
import threading
from flask import Flask, request, jsonify
from openai import OpenAI

app = Flask(__name__)

client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])

# Simple in-memory rate limiter: max requests per IP per window
RATE_LIMIT = 10
RATE_WINDOW = 60
_rate_store = {}
_rate_lock = threading.Lock()


def _is_rate_limited(ip):
    now = time.monotonic()
    with _rate_lock:
        if ip in _rate_store:
            timestamps = _rate_store[ip]
            timestamps = [t for t in timestamps if now - t < RATE_WINDOW]
            if len(timestamps) >= RATE_LIMIT:
                _rate_store[ip] = timestamps
                return True
            timestamps.append(now)
            _rate_store[ip] = timestamps
        else:
            _rate_store[ip] = [now]
    return False


SYSTEM_PROMPT = """You are a helpful assistant for ai.doo (aidoo.biz), a private-first AI products and bespoke solutions company based on the Isle of Man.

Key facts about ai.doo:
- Builds private, self-hosted AI products and extends them into bespoke solutions for real environments
- Core principle: customer data never leaves their own infrastructure
- Contact: hello@aidoo.biz

PIKA — document intelligence:
- Self-hosted document Q&A application
- Upload, index, and query internal documents using local AI models
- No data ever sent to external servers; runs entirely within the customer's infrastructure
- Features: RAG (retrieval-augmented generation), citations, streaming answers, multi-user auth, feedback
- Changelog at aidoo.biz/pika/changelog

VERA — OCR validation:
- Self-hosted OCR validation platform for scanned documents, receipts, and invoices
- Upload scans, PaddleOCR extracts text, human reviews and corrects low-confidence tokens, then exports
- Verification-first: AI assists but humans approve before any data is exported
- Features: token-level confidence scoring, inline correction, AI-powered summaries via Ollama, async processing, multi-page PDF support
- Product page at aidoo.biz/vera/

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
    if _is_rate_limited(request.remote_addr):
        return jsonify({"error": "Too many requests. Please try again later."}), 429

    data = request.get_json(silent=True)
    if not data or not isinstance(data.get("message"), str):
        return jsonify({"error": "Missing message"}), 400

    message = data["message"].strip()
    if not message:
        return jsonify({"error": "Empty message"}), 400
    if len(message) > 1000:
        return jsonify({"error": "Message too long"}), 400

    try:
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
    except Exception:
        return jsonify({"error": "Something went wrong. Please try again later."}), 502
