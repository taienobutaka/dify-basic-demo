import express from "express";
import fetch from "node-fetch";

const app = express();

// ====== 設定 ======
const PORT = process.env.PORT || 3000;

// Renderの環境変数に入れる
// Key: DIFY_API_KEY  Value: （DifyのAPIキー）
const DIFY_API_KEY = process.env.DIFY_API_KEY;

// Basic認証（要件通り固定）
const BASIC_USER = process.env.BASIC_USER || "demo";
const BASIC_PASS = process.env.BASIC_PASS || "demo";

// ====== middleware ======
app.use(express.json());

// Basic auth middleware（全ルートに適用）
app.use((req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    res.set("WWW-Authenticate", 'Basic realm="Restricted"');
    return res.status(401).send("Authentication required.");
  }

  const encoded = auth.split(" ")[1] || "";
  const decoded = Buffer.from(encoded, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");

  if (user === BASIC_USER && pass === BASIC_PASS) return next();

  res.set("WWW-Authenticate", 'Basic realm="Restricted"');
  return res.status(401).send("Invalid credentials.");
});

// 静的ファイル（index.html）配信
app.use(express.static("./"));

// ヘルスチェック
app.get("/health", (_req, res) => res.status(200).send("ok"));

// ====== API: Dify中継 ======
app.post("/api/analyze", async (req, res) => {
  try {
    if (!DIFY_API_KEY) {
      return res
        .status(500)
        .json({ error: "DIFY_API_KEY is not set on server." });
    }

    const query = (req.body?.query ?? "").toString().trim();
    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const response = await fetch("https://api.dify.ai/v1/chat-messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: "blocking",
        user: "demo-user",
      }),
    });

    const data = await response.json();

    // Difyの返答本体は data.answer に入ってる
    let answer = data.answer;

    // answer が JSON文字列ならオブジェクトにして返す（できなければ文字列のまま）
    try {
      answer = JSON.parse(answer);
    } catch (e) {}

    return res.json(answer);
  } catch (e) {
    return res.status(500).json({ error: "Server error", details: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
