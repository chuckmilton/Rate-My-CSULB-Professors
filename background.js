import LRUCache from './lrucache.js';

const cache = new LRUCache(100); // Cache with a limit of 100 entries
const proxyURL = "http://localhost:3000/graphql"; // Proxy server URL
const CSULB_SCHOOL_ID = "U2Nob29sLTE4ODQ2"; // CSULB legacyId

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetchProfessorDetails') {
    const { professorName } = message;

    // Check cache first
    if (cache.get(professorName)) {
      console.log(`Cache hit for ${professorName}`);
      sendResponse({ success: true, details: cache.get(professorName) });
      return;
    }

    console.log(`Cache miss for ${professorName}, querying API...`);

    fetchProfessorDetails(professorName)
      .then((details) => {
        cache.set(professorName, details); // Cache the result
        sendResponse({ success: true, details });
      })
      .catch((error) => {
        console.error(`Error fetching details for ${professorName}:`, error);
        sendResponse({ success: false, error: error.message });
      });

    return true; // Keep the message channel open for async response
  }
});

// Jaro-Winkler Similarity
function jaroWinkler(s1, s2) {
    const m = new Map();
    const maxDist = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
  
    let matches = 0;
    let transpositions = 0;
    const matchedS2 = Array(s2.length).fill(false);
  
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - maxDist);
      const end = Math.min(i + maxDist + 1, s2.length);
  
      for (let j = start; j < end; j++) {
        if (matchedS2[j]) continue;
        if (s1[i] === s2[j]) {
          matches++;
          matchedS2[j] = true;
          m.set(i, j);
          break;
        }
      }
    }
  
    if (!matches) return 0;
  
    let k = 0;
    for (let i of m.keys()) {
      if (s1[i] !== s2[m.get(i)]) transpositions++;
    }
  
    const jaro =
      (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;
  
    // Prefix bonus for Jaro-Winkler
    let prefix = 0;
    const maxPrefix = 4; // Up to 4 characters
    for (let i = 0; i < Math.min(s1.length, s2.length, maxPrefix); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }
  
    const scalingFactor = 0.1; // Default Jaro-Winkler scaling factor
    return jaro + prefix * scalingFactor * (1 - jaro);
  }
  
  // Levenshtein Distance
  function levenshteinDistance(a, b) {
    const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
      Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
  
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j], matrix[i][j - 1], matrix[i - 1][j - 1]) + 1;
        }
      }
    }
  
    return matrix[a.length][b.length];
  }
  
  // Normalize Levenshtein Distance
  function normalizedLevenshtein(a, b) {
    const dist = levenshteinDistance(a, b);
    return 1 - dist / Math.max(a.length, b.length);
  }
  
  // Improved Name Similarity Check
  function areFirstNamesSimilar(firstName1, firstName2) {
    const jaroScore = jaroWinkler(firstName1, firstName2);
    const levScore = normalizedLevenshtein(firstName1, firstName2);
  
    // Weighted combination
    const similarity = 0.7 * jaroScore + 0.3 * levScore;
  
    // Adaptive threshold
    const adaptiveThreshold = firstName1.length < 4 || firstName2.length < 4 ? 0.9 : 0.8;
  
    return similarity >= adaptiveThreshold;
  }
  

// Fetch professor details from proxy server
async function fetchProfessorDetails(name) {
    try {
      const nameParts = name.trim().split(/\s+/);
      const lastName = nameParts.pop(); // Extract the last name
      const firstName = nameParts.join(' '); // Join remaining parts as the first name
  
      const query = {
        query: `
          query {
            newSearch {
              teachers(query: { text: "${name}", schoolID: "${CSULB_SCHOOL_ID}" }) {
                edges {
                  node {
                    firstName
                    lastName
                    department
                    avgRating
                    avgDifficulty
                    numRatings
                    wouldTakeAgainPercent
                    legacyId
                    teacherRatingTags {
                      tagName
                      tagCount
                    }
                    ratings {
                      edges {
                        node {
                          comment
                          class
                          thumbsUpTotal
                          thumbsDownTotal
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `,
      };
  
      const response = await fetch(proxyURL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(query),
      });
  
      const data = await response.json();
      const edges = data?.data?.newSearch?.teachers?.edges;
  
      if (!edges || edges.length === 0) {
        return {
          professorName: "N/A",
          department: "N/A",
          rating: "N/A",
          difficulty: "N/A",
          wouldTakeAgain: "N/A",
          numRatings: 0,
          topTags: [],
          comments: [],
          profileLink: null,
        };
      }
  
      const matchedProfessor = edges.find((edge) => {
        const professor = edge.node;
        const professorFirstName = professor.firstName.toLowerCase();
        const normalizedFirstName = firstName.toLowerCase();
        return (
          professor.lastName.toLowerCase() === lastName.toLowerCase() &&
          (professorFirstName === normalizedFirstName ||
            areFirstNamesSimilar(professorFirstName, normalizedFirstName))
        );
      });
  
      if (matchedProfessor) {
        const professor = matchedProfessor.node;
  
        const comments = professor.ratings.edges.map((rating) => ({
          comment: rating.node.comment,
          class: rating.node.class,
          likes: rating.node.thumbsUpTotal,
          dislikes: rating.node.thumbsDownTotal,
        }));
  
        const profileLink = `https://www.ratemyprofessors.com/ShowRatings.jsp?tid=${professor.legacyId}`;
        const topTags = professor.teacherRatingTags.map((tag) => ({
          name: tag.tagName,
          count: tag.tagCount,
        }));
  
        return {
          professorName: `${professor.firstName} ${professor.lastName}`,
          department: professor.department || "N/A",
          rating: professor.avgRating || "N/A",
          difficulty: professor.avgDifficulty || "N/A",
          wouldTakeAgain: professor.wouldTakeAgainPercent || "N/A",
          numRatings: professor.numRatings || 0,
          topTags,
          comments,
          profileLink,
        };
      }
  
      return {
        professorName: "N/A",
        department: "N/A",
        rating: "N/A",
        difficulty: "N/A",
        wouldTakeAgain: "N/A",
        numRatings: 0,
        topTags: [],
        comments: [],
        profileLink: null,
      };
    } catch (error) {
      console.error(`Error in fetchProfessorDetails:`, error);
      return {
        professorName: "N/A",
        department: "N/A",
        rating: "N/A",
        difficulty: "N/A",
        wouldTakeAgain: "N/A",
        numRatings: 0,
        topTags: [],
        comments: [],
        profileLink: null,
      };
    }
  }
  
  

