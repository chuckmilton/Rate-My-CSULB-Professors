import fetch from "node-fetch";
import dotenv from "dotenv";
import NodeCache from "node-cache";

dotenv.config();

const AUTHORIZATION_TOKEN = process.env.AUTHORIZATION_TOKEN;

// Initialize cache: 1-hour TTL and max 2,000 professors
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600, maxKeys: 2000 });

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*"); // Allow all origins or dynamically set
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method === "POST") {
    try {
      const { query } = req.body;

      // Use the query string as the cache key
      const cacheKey = JSON.stringify(query).replace(/\s+/g, ' ').trim();

      // Check if data exists in cache
      const cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log("Cache hit:", cacheKey);
        return res.status(200).json(cachedData);
      }

      console.log("Cache miss:", cacheKey);

      // If no cache, fetch from API
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

      // Cache the result for future use
      cache.set(cacheKey, data);

      res.status(200).json(data);
    } catch (error) {
      console.error("Error fetching data:", error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: "Method not allowed" });
  }
}
