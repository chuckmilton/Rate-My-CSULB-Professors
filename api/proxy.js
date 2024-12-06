import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const AUTHORIZATION_TOKEN = process.env.AUTHORIZATION_TOKEN;

export default async function handler(req, res) {
  // Set CORS headers for the Chrome extension
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    try {
      const { query } = req.body;

      const response = await fetch("https://www.ratemyprofessors.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": AUTHORIZATION_TOKEN, // Add the Bearer token
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36",
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
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
