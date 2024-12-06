import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const AUTHORIZATION_TOKEN = process.env.AUTHORIZATION_TOKEN;

export default async function handler(req, res) {
  try {
    // Set CORS headers to allow requests from all origins or your specific extension
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*"); // Use "*" for all origins, or restrict to your extension origin
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Handle preflight OPTIONS request
    if (req.method === "OPTIONS") {
      res.status(200).end();
      return;
    }

    if (req.method === "POST") {
      // Extract the GraphQL query from the request body
      const { query } = req.body;

      // Forward the request to the RateMyProfessors GraphQL API
      const response = await fetch("https://www.ratemyprofessors.com/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: AUTHORIZATION_TOKEN,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.81 Safari/537.36",
        },
        body: JSON.stringify({ query }),
      });

      // Check if the response was successful
      if (!response.ok) {
        console.error(`Error fetching data: ${response.statusText}`);
        res.status(response.status).json({ error: response.statusText });
        return;
      }

      // Parse the JSON response from RateMyProfessors and return it
      const data = await response.json();
      res.status(200).json(data);
    } else {
      // If the method is not POST, return a 405 Method Not Allowed
      res.status(405).json({ error: "Method not allowed" });
    }
  } catch (error) {
    // Log and return any server-side errors
    console.error("Error in handler:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
