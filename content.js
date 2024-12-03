console.log('Content script is running!');
let currentTooltip = null; // Track the currently visible tooltip
let emojis = {}; // Object to store the loaded emojis

// Load emojis.json
fetch(chrome.runtime.getURL('emojis.json'))
  .then((response) => response.json())
  .then((data) => {
    emojis = data; // Store the emojis in memory
    console.log('Emojis loaded:', emojis);
  })
  .catch((error) => console.error('Failed to load emojis.json:', error));

// Function to request professor details from the background script
function fetchProfessorDetails(name) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'fetchProfessorDetails', professorName: name },
      (response) => {
        if (response && response.success) {
          resolve(response.details);
        } else {
          reject(response ? response.error : 'No response from background script');
        }
      }
    );
  });
}

// Function to compare last names, handling multi-part last names
function areLastNamesSimilar(lastName1, lastName2) {
  // Split the last names into parts
  const parts1 = lastName1.split(' ');
  const parts2 = lastName2.split(' ');

  // Check if any part in one name is similar to any part in the other name
  for (let part1 of parts1) {
    for (let part2 of parts2) {
      if (areNamesSimilar(part1, part2)) {
        return true;
      }
    }
  }

  // Also check if one last name is included in the other
  if (lastName1.includes(lastName2) || lastName2.includes(lastName1)) {
    return true;
  }

  return false;
}

// Create a tooltip for detailed data
function createTooltip(details) {
  const tooltip = document.createElement('div');
  tooltip.classList.add('prof-card'); // Use a base class for the professor card styling
  const profileLink = details.profileLink || '#';
  const departmentEmojis = emojis[details.department] || '';

  // Define emojis for different categories
  const ratingEmoji = details.rating >= 4.0 ? '⭐' : details.rating >= 3.0 ? '👍' : '👎';
  const difficultyEmoji = details.difficulty >= 4.0 ? '🔥' : details.difficulty >= 3.0 ? '😬' : '💡';
  const wouldTakeAgainEmoji =
    details.wouldTakeAgain >= 75 ? '🎉' : details.wouldTakeAgain >= 50 ? '🙂' : '😞';

  // Color utility for ratings
  const getRatingColor = (rating) =>
    rating >= 4.0 ? '#7ff6c3' : rating >= 3.0 ? '#fff170' : '#ff9c9c';

  const getInverseRatingColor = (value) =>
    value >= 0.75 ? '#7ff6c3' : value >= 0.5 ? '#fff170' : '#ff9c9c';

  const getDifficultyColor = (difficulty) =>
    difficulty <= 2.0 ? '#7ff6c3' : difficulty <= 3.0 ? '#fff170' : '#ff9c9c';

  // Create the Title Section
  const titleSection = `
    <div class="prof-card-name-and-logo">
      <a href="${profileLink}" target="_blank" class="prof-card-rating-title">
        ${details.professorName || 'N/A'}
      </a>
      <img src="${chrome.runtime.getURL('images/rmp.svg')}" alt="Logo" class="prof-card-logo" />
    </div>
    <div class="prof-card-department">
      ${details.department || 'Department not listed'} ${departmentEmojis}
    </div>
  `;

  // Create the Main Info Section with color-coded backgrounds
  const mainInfoSection = `
    <div class="prof-card-main-info">
      <div class="prof-card-detail">
        <span class="prof-card-label">Rating:</span>
        <span class="prof-card-value" style="background-color: ${getRatingColor(details.rating)};">
          ${details.rating || 'N/A'} ${ratingEmoji}
        </span>
      </div>
      <div class="prof-card-detail">
        <span class="prof-card-label">Review(s):</span>
        <span class="prof-card-value" style="background-color: #f0f0f0;">
          ${details.numRatings || 0}
        </span>
      </div>
      <div class="prof-card-detail">
        <span class="prof-card-label">Would Take Again:</span>
        <span class="prof-card-value" style="background-color: ${getInverseRatingColor(
          details.wouldTakeAgain / 100
        )};">
          ${details.wouldTakeAgain || 'N/A'}% ${wouldTakeAgainEmoji}
        </span>
      </div>
      <div class="prof-card-detail">
        <span class="prof-card-label">Difficulty:</span>
        <span class="prof-card-value" style="background-color: ${getDifficultyColor(
          details.difficulty
        )};">
          ${details.difficulty || 'N/A'} ${difficultyEmoji}
        </span>
      </div>
    </div>
  `;

  // Create the Tags Section
  const tags =
    details.topTags
      .slice(0, 5)
      .map((tag) => `<span class="prof-card-tag-bubble">${tag.name} (${tag.count})</span>`)
      .join('') || 'No tags available';

  const tagsSection = `
    <div class="prof-card-tags">${tags}</div>
  `;

  // Create the Comments Section
  const comments =
    details.comments
      .slice(0, 3)
      .map(
        (comment) =>
          `<div class="prof-card-review">
            <div class="prof-card-review-header">
              <div class="prof-card-review-course">${comment.class || 'N/A'}</div>
              <div class="prof-card-review-date">👍${comment.likes || 0} / 👎${
            comment.dislikes || 0
          }</div>
            </div>
            <div class="prof-card-review-comment">${comment.comment || 'No comment'}</div>
          </div>`
      )
      .join('') || '<div>No comments available</div>';

  const commentsSection = `
    <div class="prof-card-comments">${comments}</div>
  `;

  // Combine all sections into the tooltip
  tooltip.innerHTML = `
    ${titleSection}
    <hr />
    ${mainInfoSection}
    <hr />
    ${tagsSection}
    <hr />
    ${commentsSection}
  `;

  tooltip.style.position = 'absolute';
  tooltip.style.backgroundColor = '#f5f5f5';
  tooltip.style.padding = '15px';
  tooltip.style.borderRadius = '10px';
  tooltip.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
  tooltip.style.zIndex = '1000';
  tooltip.style.display = 'none';

  tooltip.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.body.appendChild(tooltip);
  return tooltip;
}

function processProfessorElements() {
  const professorElements = document.querySelectorAll('[id^="MTG_INSTR"]');
  const schedulerProfessorElements = document.querySelectorAll(
    'td.css-1p12g40-cellCss-hideOnMobileCss span'
  );
  console.log('Found professor elements:', professorElements);
  console.log('Found professor elements (Scheduler):', schedulerProfessorElements);

  // Process elements from both sources
  const allProfessorElements = [...professorElements, ...schedulerProfessorElements];

  allProfessorElements.forEach(async (element) => {
    if (element.querySelector('.rating-badge')) {
      return; // Skip if badge already exists
    }

    const professorName = element.textContent.trim();
    const professorNames = element.textContent.trim();

    // Skip invalid names containing "To be Announced" or "TBA"
    if (/^\s*(To be Announced|TBA)\s*$/i.test(professorName)) {
      console.log(`Skipping placeholder name: ${professorName}`);
      return;
    }

    // Updated regex to allow hyphens, periods, and apostrophes
    if (!/^[a-zA-Z\s,\-\.']+$/.test(professorNames)) {
      console.log(`Skipping invalid name: ${professorNames}`);
      return;
    }

    // Split names by commas and process each name
    const namesArray = professorNames.split(/\s*,\s*/); // Split by commas and trim spaces

    for (const name of namesArray) {
      console.log(`Fetching details for: ${name}`);

      try {
        const details = await fetchProfessorDetails(name);

        // Create a rating badge for each professor
        const ratingBadge = document.createElement('span');
        ratingBadge.textContent = details.rating || 'N/A';
        ratingBadge.classList.add('rating-badge');

        // Apply background color based on rating
        const rating = parseFloat(details.rating);
        if (rating >= 0 && rating <= 2.9) {
          ratingBadge.style.backgroundColor = '#ff9c9c'; // Red
        } else if (rating >= 3.0 && rating <= 3.9) {
          ratingBadge.style.backgroundColor = '#fff170'; // Yellow
        } else if (rating >= 4.0 && rating <= 5.0) {
          ratingBadge.style.backgroundColor = '#7ff6c3'; // Green
        } else {
          ratingBadge.style.backgroundColor = '#d3d3d3'; // Gray for N/A or invalid
        }
        ratingBadge.style.color = 'black';
        ratingBadge.style.padding = '2px 6px';
        ratingBadge.style.borderRadius = '4px';
        ratingBadge.style.marginLeft = '8px';
        ratingBadge.style.cursor = 'pointer';

        // Add a tooltip
        const tooltip = createTooltip(details);

        // Manage tooltip visibility
        ratingBadge.addEventListener('click', (event) => {
          event.stopPropagation();
          if (currentTooltip && currentTooltip !== tooltip) {
            currentTooltip.style.display = 'none';
          }
          tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
          tooltip.style.top = `${event.pageY + 10}px`;
          tooltip.style.left = `${event.pageX + 10}px`;
          currentTooltip = tooltip.style.display === 'block' ? tooltip : null;
        });

        element.appendChild(ratingBadge);
      } catch (error) {
        console.error(`Error fetching details for ${name}:`, error);
      }
    }
  });
}

// Global click to close tooltip
document.addEventListener('click', () => {
  if (currentTooltip) {
    currentTooltip.style.display = 'none';
    currentTooltip = null;
  }
});

// Observe dynamic changes in the DOM
let timeout;
const observer = new MutationObserver(() => {
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(() => {
    console.log('DOM mutated. Checking for new professor elements...');
    processProfessorElements();
  }, 700);
});

// Start observing for dynamic changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial processing
document.addEventListener('DOMContentLoaded', () => {
  console.log('Content script loaded and running!');
  processProfessorElements();
});
