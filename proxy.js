import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const AUTHORIZATION_TOKEN = process.env.AUTHORIZATION_TOKEN;

// Allow CORS for the extension
app.use(cors());
app.use(express.json());

app.post("/graphql", async (req, res) => {
  try {
    const query = req.body.query;

    const response = await fetch("https://www.ratemyprofessors.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": AUTHORIZATION_TOKEN, // Add the Bearer token to the headers
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error(`Error fetching data: ${response.statusText}`);
      return res.status(response.status).json({ error: response.statusText });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});
