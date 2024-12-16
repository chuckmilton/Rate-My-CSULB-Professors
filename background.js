import LRUCache from './lrucache.js';

const cache = new LRUCache(200); // Cache with a limit of 200 entries
const proxyURL = "https://www.ratemyprofessors.com/graphql"; // Proxy server URL
const CSULB_SCHOOL_ID = "U2Nob29sLTE4ODQ2"; // CSULB legacyId
const AUTHORIZATION_TOKEN = "Basic dGVzdDp0ZXN0";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'fetchProfessorDetails') {
    const { professorName } = message;

    // Check cache first
    if (cache.get(professorName)) {
      sendResponse({ success: true, details: cache.get(professorName) });
      return;
    }
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
function areNamesSimilar(name1, name2) {
  const jaroScore = jaroWinkler(name1, name2);
  const levScore = normalizedLevenshtein(name1, name2);

  // Exact initial matches (e.g., "M" matches "Michael")
  if (name1.length === 1 || name2.length === 1) {
    return name1.charAt(0).toLowerCase() === name2.charAt(0).toLowerCase();
  }

  // Weighted combination
  const similarity = 0.7 * jaroScore + 0.3 * levScore;

  // Adaptive threshold
  const adaptiveThreshold = Math.min(name1.length, name2.length) < 4 ? 0.95 : 0.85;

  return similarity >= adaptiveThreshold;
}


// Function to clean the professor's name
function cleanProfessorName(name) {
  let cleanName = name;

  // Remove "To be Announced" and "TBA" wherever they appear
  cleanName = cleanName.replace(/(To be Announced|TBA)/gi, '');

  // Remove periods from initials
  cleanName = cleanName.replace(/\b([A-Z])\./g, '$1');

  // Trim and remove extra spaces
  cleanName = cleanName.trim().replace(/\s+/g, ' ');

  return cleanName;
}

// Function to clean individual name parts
function cleanNamePart(namePart) {
  let cleanPart = namePart;

  // Remove "To be Announced" and "TBA" wherever they appear
  cleanPart = cleanPart.replace(/(To be Announced|TBA)/gi, '');

  // Remove periods from initials
  cleanPart = cleanPart.replace(/\b([A-Z])\./g, '$1');

  // Remove dashes (replace with spaces)
  cleanPart = cleanPart.replace(/-/g, ' ');

  // Trim and remove extra spaces
  cleanPart = cleanPart.trim().replace(/\s+/g, ' ');

  return cleanPart;
}

// Function to generate possible first and last name combinations
function generateNameCombinations(fullName) {
  const nameParts = fullName.trim().split(/\s+/);
  const combinations = [];

  const numParts = nameParts.length;

  // Original combinations
  for (let i = 0; i <= numParts; i++) {
    const firstName = nameParts.slice(0, i).join(' ');
    const lastName = nameParts.slice(i).join(' ');
    combinations.push({ firstName, lastName });
  }

  // If name has more than two parts, add combinations excluding middle names
  if (numParts > 2) {
    const firstName = nameParts[0];
    const lastName = nameParts[numParts - 1];
    combinations.push({ firstName, lastName });
  }

  // Handle swapped first and last name
  if (numParts === 2) {
    const swappedCombination = {
      firstName: nameParts[1],
      lastName: nameParts[0],
    };
    combinations.push(swappedCombination);
  }

  return combinations;
}


// Fetch professor details from proxy server
async function fetchProfessorDetails(name) {
  try {
    // Clean the input professor name
    const cleanedName = cleanProfessorName(name);

    // Generate possible first and last name combinations
    const nameCombinations = generateNameCombinations(cleanedName.toLowerCase());

    const query = {
      query: `
        query {
          newSearch {
            teachers(query: { text: "${cleanedName}", schoolID: "${CSULB_SCHOOL_ID}" }) {
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
      headers: {
				'Content-Type': 'application/json',
				Accept: 'application/json',
				Authorization: AUTHORIZATION_TOKEN,
			},
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

    // Collect all matching professors
    const matchingProfessors = [];

    for (let edge of edges) {
      const professor = edge.node;

      // Clean professor's names
      let profFirstName = cleanNamePart(professor.firstName).toLowerCase();
      let profLastName = cleanNamePart(professor.lastName).toLowerCase();

      // Handle hyphens in professor's names by splitting them
      const profFirstNames = profFirstName.split(' ');
      const profLastNames = profLastName.split(' ');

      for (let { firstName: normalizedFirstName, lastName: normalizedLastName } of nameCombinations) {
        
        // Check for "Dr" prefix match
      const isStrictLastNameMatch = normalizedFirstName.toLowerCase() === "dr" &&
      areNamesSimilar(profLastName, normalizedLastName);

    // General matching logic
      const isFirstNameMatch =
      (normalizedFirstName.length === 1 // Check if the input is an initial
        ? profFirstName.startsWith(normalizedFirstName) // Initial matches the start of the full name
        : areNamesSimilar(profFirstName, normalizedFirstName)) || // Full names are similar
      (profFirstName.length === 1 && normalizedFirstName.startsWith(profFirstName)); // Dataset has initial, input has full name

      const isLastNameMatch = 
      areNamesSimilar(profLastName, normalizedLastName) || // Full last name matches
      profLastNames.some((part) => areNamesSimilar(part, normalizedLastName)) || // Part of hyphenated name matches
      (profLastName.includes('-') && profLastName.split('-').some((part) => areNamesSimilar(part, normalizedLastName))) || // Explicit split for hyphenated names
      (normalizedLastName.includes('-') && normalizedLastName.split('-').some((part) => areNamesSimilar(part, profLastName))); // Explicit split for input hyphenated names

    const isPrefixMatch =
      profLastName === normalizedLastName &&
      normalizedFirstName.length > 0 &&
      profFirstName.startsWith(normalizedFirstName);

    // Add professor to matches if a strict last name match is found (for "Dr") or general criteria are met
    if (isStrictLastNameMatch || (isLastNameMatch && isFirstNameMatch) || isPrefixMatch) {
      matchingProfessors.push(professor);
      break; // Stop checking other combinations if a match is found
    }
  }
    }

    if (matchingProfessors.length > 0) {
      // Prefer professors with ratings
      matchingProfessors.sort((a, b) => {
        const aHasRatings = a.numRatings && a.numRatings > 0;
        const bHasRatings = b.numRatings && b.numRatings > 0;

        if (aHasRatings && !bHasRatings) return -1;
        if (!aHasRatings && bHasRatings) return 1;

        // If both have ratings, prefer the one with more ratings
        if (a.numRatings && b.numRatings) return b.numRatings - a.numRatings;

        return 0;
      });

      // If the best match has no ratings, try to find a duplicate with ratings
      let professor = matchingProfessors[0];
      if ((!professor.numRatings || professor.numRatings === 0) && matchingProfessors.length > 1) {
        const professorWithRatings = matchingProfessors.find(
          (prof) => prof.numRatings && prof.numRatings > 0
        );
        if (professorWithRatings) {
          professor = professorWithRatings;
        }
      }

      const comments = professor.ratings.edges.map((rating) => ({
        comment: rating.node.comment,
        class: rating.node.class,
        likes: rating.node.thumbsUpTotal,
        dislikes: rating.node.thumbsDownTotal,
      }));

      const profileLink = `https://www.ratemyprofessors.com/professor/${professor.legacyId}`;
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