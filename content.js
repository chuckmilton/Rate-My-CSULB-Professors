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
  tooltip.classList.add('prof-card'); // Base class for styling

  // Check if professor details are not available
  if (details.professorName === "N/A") {
    // Create a custom CSULB-themed card
    const customCard = `
      <div class="custom-prof-card">
        <div class="custom-prof-card-header">
          <img src="${chrome.runtime.getURL('images/csulb_logo.png')}" alt="CSULB Logo" class="csulb-logo" />
          <h3>Professor Not Found!</h3>
          <img src="${chrome.runtime.getURL('images/shark.png')}" alt="Frustrated Shark" class="frustrated-shark" />
        </div>
        <div class="custom-prof-card-body">
          <p>Elbee not happy—how dare you leave us hanging without professor info!</p>
          <p>Time to navigate to another resource, perhaps?</p>
        </div>
      </div>
    `;
    tooltip.innerHTML = customCard;
    tooltip.classList.add('custom-tooltip'); // Additional class for custom styling
  } else {
    // Existing standard tooltip for professors with available details
    const profileLink = details.profileLink || '#';
    const departmentEmojis = emojis[details.department] || '';

    // Define emojis for different categories
    const ratingEmoji = details.rating >= 4.0 ? '⭐' : details.rating >= 3.0 ? '👌' : '💩';
    const difficultyEmoji = details.difficulty >= 4.0 ? '💀' : details.difficulty >= 3.0 ? '🤯' : '🌈';
    const roundedWouldTakeAgain = Math.round(details.wouldTakeAgain) || 'N/A';
    const wouldTakeAgainEmoji =
      roundedWouldTakeAgain >= 75 ? '🥳' : roundedWouldTakeAgain >= 50 ? '😐' : '🤡';

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
            roundedWouldTakeAgain / 100
          )};">
            ${roundedWouldTakeAgain}% ${wouldTakeAgainEmoji}
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
  }

  // Common styling for all tooltips
  tooltip.style.position = 'absolute';
  tooltip.style.padding = '15px';
  tooltip.style.borderRadius = '10px';
  tooltip.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
  tooltip.style.zIndex = '1000';
  tooltip.style.display = 'none';

  // Add specific styling for the custom tooltip
  if (details.professorName === "N/A") {
    tooltip.style.backgroundColor = '#f0e68c'; // Example: Khaki background for fun
  } else {
    tooltip.style.backgroundColor = '#f5f5f5'; // Default background for standard tooltip
  }

  tooltip.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  document.body.appendChild(tooltip);
  return tooltip;
}


// Function to handle fetching and displaying professor details
async function handleProfessorDetails(element, name) {
  // Add a thinking emoji as a placeholder
  const thinkingEmoji = document.createElement('span');
  thinkingEmoji.textContent = '🤔'; // Thinking emoji
  thinkingEmoji.style.marginLeft = '8px';
  thinkingEmoji.style.opacity = '0.7'; // Slight transparency to indicate "loading"
  element.appendChild(thinkingEmoji);

  try {
    const details = await fetchProfessorDetails(name);
    thinkingEmoji.remove();

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

    requestAnimationFrame(() => {
      ratingBadge.style.opacity = '1';
    });
  } catch (error) {
    console.error(`Error fetching details for ${name}:`, error);
    // Change emoji to a warning symbol on error
    thinkingEmoji.textContent = '⚠️'; // Warning emoji
    thinkingEmoji.style.color = 'red'; // Optional: Change color to red
  }
}

// Main function to process professor elements based on the current site
function processProfessorElements() {
  // Detect current website using the hostname
  const currentSite = window.location.hostname;
  console.log(`Current site detected: ${currentSite}`);

  // Define site-specific processing
  if (currentSite.includes('csulb.collegescheduler.com')) {
    console.log('Processing CSULB Scheduler site...');
    processSchedulerSite();
  } else {
    console.log('Processing other site...');
    processOtherSite();
  }
}

// Function to process the CSULB Scheduler site
function processSchedulerSite() {
  const schedulerProfessorElements = document.querySelectorAll(
    'td.css-1p12g40-cellCss-hideOnMobileCss'
  );
  console.log('Found professor elements (Scheduler):', schedulerProfessorElements);

  // Define weekdays and abbreviations to skip
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const abbreviations = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  schedulerProfessorElements.forEach(async (element) => {
    if (element.querySelector('.rating-badge')) {
      return; // Skip if badge already exists
    }

    // Check for weekday-related content
    const containsWeekday = Array.from(element.querySelectorAll('span')).some((span) => {
      const ariaLabel = span.getAttribute('aria-label')?.toLowerCase();
      const textContent = span.textContent.trim();
      console.log(`ariaLabel: ${ariaLabel}, textContent: ${textContent}`);
      return (
        weekdays.some((day) => day.toLowerCase() === ariaLabel) || // Full weekday names
        abbreviations.includes(textContent) // Abbreviations
      );
    });

    if (containsWeekday) {
      console.log(`Skipping element due to weekday content:`, element);
      return;
    }

    // Extract professor names from nested spans
    const professorSpans = element.querySelectorAll('span');
    const professorNames = Array.from(professorSpans)
      .map((span) => span.textContent.trim())
      .filter((name) => /^[a-zA-Z\s\-\.']+$/.test(name)); // Validate names

    if (professorNames.length === 0) {
      console.log('No valid professor names found in element:', element);
      return;
    }

    for (const name of professorNames) {
      console.log(`Fetching details for: ${name}`);
      await handleProfessorDetails(element, name);
    }
  });
}

// Function to process the other site
function processOtherSite() {
  const professorElements = document.querySelectorAll('[id^="MTG_INSTR"]');
  console.log('Found professor elements:', professorElements);

  // Define weekdays and abbreviations to skip (if applicable)
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const abbreviations = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  professorElements.forEach(async (element) => {
    if (element.querySelector('.rating-badge')) {
      return; // Skip if badge already exists
    }

    // Check for weekday-related content
    const containsWeekday = Array.from(element.querySelectorAll('span')).some((span) => {
      const ariaLabel = span.getAttribute('aria-label')?.toLowerCase();
      const textContent = span.textContent.trim();
      console.log(`ariaLabel: ${ariaLabel}, textContent: ${textContent}`);
      return (
        weekdays.some((day) => day.toLowerCase() === ariaLabel) || // Full weekday names
        abbreviations.includes(textContent) // Abbreviations
      );
    });

    if (containsWeekday) {
      console.log(`Skipping element due to weekday content:`, element);
      return;
    }

    const professorName = element.textContent.trim();

    // Skip invalid names containing "To be Announced" or "TBA"
    if (/^\s*(To be Announced|TBA)\s*$/i.test(professorName)) {
      console.log(`Skipping placeholder name: ${professorName}`);
      return;
    }

    // Updated regex to allow hyphens, periods, and apostrophes
    if (!/^[a-zA-Z\s,\-\.']+$/.test(professorName)) {
      console.log(`Skipping invalid name: ${professorName}`);
      return;
    }

    // Split names by commas and process each name
    const namesArray = professorName.split(/\s*,\s*/); // Split by commas and trim spaces

    for (const name of namesArray) {
      console.log(`Fetching details for: ${name}`);
      await handleProfessorDetails(element, name);
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
