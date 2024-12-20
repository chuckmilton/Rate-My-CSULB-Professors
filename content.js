let currentTooltip = null; // Track the currently visible tooltip
let emojis = {}; // Object to store the loaded emojis
let nameMappings = {}; // Object to store the name mappings
let excludedSubjects = new Set(); // Initialize an empty Set for excluded subjects

// **Color Utility Functions**
function getAverageRatingColor(rating) {
  if (rating === 'N/A') return '#d3d3d3'; // Gray for N/A
  const numRating = parseFloat(rating);
  if (isNaN(numRating)) return '#d3d3d3';

  if (numRating >= 4.0) return '#7ff6c3'; // Light Green
  if (numRating >= 3.0) return '#fff170'; // Light Yellow
  return '#ff9c9c'; // Light Red for ratings below 3.0
}

function getDifficultyColor(difficulty) {
  if (difficulty === 'N/A') return '#d3d3d3'; // Gray for N/A
  const numDifficulty = parseFloat(difficulty);
  if (isNaN(numDifficulty)) return '#d3d3d3';

  if (numDifficulty >= 4.0) return '#ff9c9c'; // Light Red for High Difficulty
  if (numDifficulty >= 3.0) return '#fff170'; // Light Yellow for Medium Difficulty
  return '#7ff6c3'; // Light Green for Low Difficulty
}

function getWouldTakeAgainColor(value) {
  if (value === 1) return '#b3ffe6'; // Light Green for Yes
  if (value === 0) return '#ffe6e6'; // Light Red for No
  return '#d3d3d3'; // Gray for N/A
}

function getWouldTakeAgainPercentageColor(percentage) {
  if (percentage === 'N/A') return '#d3d3d3'; // Gray for N/A
  const numPercentage = parseFloat(percentage);
  if (isNaN(numPercentage)) return '#d3d3d3'; // Gray for invalid numbers

  if (numPercentage >= 75) return '#7ff6c3'; // Light Green for high percentage
  if (numPercentage >= 50) return '#fff170'; // Light Yellow for medium percentage
  return '#ff9c9c'; // Light Red for low percentage
}

function getGradeColor(grade) {
  // Ensure grade is a string; if not, default to 'N/A'
  const safeGrade = typeof grade === 'string' ? grade.trim() : 'N/A';

  // Define non-standard grades that should be treated as 'N/A'
  const nonStandardGrades = ['NOT SURE YET', 'INCOMPLETE', 'RATHER NOT SAY'];

  // Check if the grade is in the non-standard grades list
  if (nonStandardGrades.includes(safeGrade.toUpperCase())) {
    return '#d3d3d3'; // Gray for non-standard grades
  }

  // Handle 'N/A' explicitly
  if (safeGrade.toUpperCase() === 'N/A') {
    return '#d3d3d3'; // Gray for N/A
  }

  const gradeUpper = safeGrade.toUpperCase();

  // Define grade categories including '+' and '-' grades
  const gradeGreen = ['A+', 'A', 'A-'];
  const gradeYellow = ['B+', 'B', 'B-'];
  const gradeRed = ['C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

  if (gradeGreen.includes(gradeUpper)) {
    return '#b3ffe6'; // Light Green
  }

  if (gradeYellow.includes(gradeUpper)) {
    return '#ffffcc'; // Light Yellow
  }

  if (gradeRed.includes(gradeUpper)) {
    return '#ffe6e6'; // Light Red
  }

  return '#d3d3d3'; // Gray for other grades
}

// **New Function: Get Individual Grade Color (Lighter Shades)**
function getIndividualGradeColor(grade) {
  // Ensure grade is a string; if not, default to 'N/A'
  const safeGrade = typeof grade === 'string' ? grade.trim() : 'N/A';

  // Define non-standard grades that should be treated as 'N/A'
  const nonStandardGrades = ['NOT SURE YET', 'INCOMPLETE', 'RATHER NOT SAY'];

  // Check if the grade is in the non-standard grades list
  if (nonStandardGrades.includes(safeGrade.toUpperCase())) {
    return '#d3d3d3'; // Lighter Gray for non-standard grades
  }

  // Handle 'N/A' explicitly
  if (safeGrade.toUpperCase() === 'N/A') {
    return '#d3d3d3'; // Lighter Gray for N/A
  }

  const gradeUpper = safeGrade.toUpperCase();

  // Define grade categories including '+' and '-' grades
  const gradeGreen = ['A+', 'A', 'A-'];
  const gradeYellow = ['B+', 'B', 'B-'];
  const gradeRed = ['C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];

  if (gradeGreen.includes(gradeUpper)) {
    return '#b3ffe6'; // Lighter Green
  }

  if (gradeYellow.includes(gradeUpper)) {
    return '#ffffcc'; // Lighter Yellow
  }

  if (gradeRed.includes(gradeUpper)) {
    return '#ffe6e6'; // Lighter Red
  }

  return '#d3d3d3'; // Lighter Gray for other grades
}

// **New Function: Get Individual Difficulty Color (Inverted Colors)**
function getIndividualDifficultyColor(difficulty) {
  if (difficulty === 'N/A') return '#d3d3d3'; // Gray for N/A
  const numDifficulty = parseFloat(difficulty);
  if (isNaN(numDifficulty)) return '#d3d3d3';

  if (numDifficulty >= 4.0) return '#ffe6e6'; // Light Red for High Difficulty
  if (numDifficulty >= 3.0) return '#ffffcc'; // Light Yellow for Medium Difficulty
  return '#b3ffe6'; // Light Green for Low Difficulty
}

function getIndividualRatingColor(rating) {
  if (rating === 'N/A') return '#d3d3d3'; // Gray for N/A
  const numRating = parseFloat(rating);
  if (isNaN(numRating)) return '#d3d3d3';

  if (numRating >= 4.0) return '#b3ffe6'; // Light Green
  if (numRating >= 3.0) return '#ffffcc'; // Light Yellow
  return '#ffe6e6'; // Light Red for ratings below 3.0
}

// Load emojis.json
fetch(chrome.runtime.getURL('emojis.json'))
  .then((response) => response.json())
  .then((data) => {
    emojis = data; // Store the emojis in memory
  })
  .catch((error) => console.error('Failed to load emojis.json:', error));

// Load nameMappings.json
fetch(chrome.runtime.getURL('nameMappings.json'))
  .then((response) => response.json())
  .then((data) => {
    nameMappings = data; // Store the name mappings in memory
  })
  .catch((error) => console.error('Failed to load nameMappings.json:', error));

function cleanExtractedName(name) {
  return name.replace(/\bTo be Announced\b/gi, '').trim();
}

fetch(chrome.runtime.getURL('excludedSubjects.json'))
  .then((response) => response.json())
  .then((data) => {
    excludedSubjects = new Set(data.map(subject => subject.toLowerCase()));
  })
  .catch((error) => console.error('Failed to load excludedSubjects.json:', error));


function isExcludedName(name) {
  const normalizedName = name.toLowerCase().trim();
  return excludedSubjects.has(normalizedName);
}

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

// Placeholder for areNamesSimilar function
function areNamesSimilar(name1, name2) {
  // Implement your similarity logic here
  return name1.toLowerCase() === name2.toLowerCase();
}

// Function to create a tooltip for detailed data
function createTooltip(details) {
  const tooltip = document.createElement('div');
  tooltip.classList.add('prof-card'); // Base class for styling

  // Check if professor details are not available
  if (details.professorName === "N/A") {
    // Create a custom CSULB-themed card
    const customCard = `
      <div class="custom-prof-card">
        <div class="custom-prof-card-header">
          <img src="${chrome.runtime.getURL('images/palm_tree.png')}" alt="Palm Tree" class="csulb-logo" />
          <h3>Professor Not Found!</h3>
          <img src="${chrome.runtime.getURL('images/shark.png')}" alt="Frustrated Shark" class="frustrated-shark" />
        </div>
        <div class="custom-prof-card-body">
          <p>Grrr not very happy—how dare they leave us hanging without professor info!</p>
          <p>Time to navigate to another resource, perhaps?</p>
        </div>
      </div>
    `;
    tooltip.innerHTML = customCard;
    tooltip.classList.add('custom-tooltip'); // Additional class for custom styling
  } else {
    const profileLink = details.profileLink || '#';
    const departmentEmojis = emojis[details.department] || '';

    // Define emojis for different categories
    const ratingEmoji = details.rating >= 4.0 ? '⭐' : details.rating >= 3.0 ? '👌' : '💩';
    const difficultyEmoji = details.difficulty >= 4.0 ? '💀' : details.difficulty >= 3.0 ? '🤯' : '🌈';
    
    // **Update "Would Take Again" Display Logic for Percentage with Rounding and Emojis**
    let wouldTakeAgainPercentage = 'N/A';
    let wouldTakeAgainColor = '#d3d3d3'; // Default to Gray
    let wouldTakeAgainEmoji = ''; // Initialize emoji

    if (details.wouldTakeAgain !== 'N/A' && !isNaN(details.wouldTakeAgain)) {
      const roundedPercentage = Math.round(parseFloat(details.wouldTakeAgain));
      wouldTakeAgainPercentage = `${roundedPercentage}%`;
      wouldTakeAgainColor = getWouldTakeAgainPercentageColor(roundedPercentage);
      
      // **Assign Emoji Based on Percentage**
      if (roundedPercentage >= 75) {
        wouldTakeAgainEmoji = '🥳'; // Celebratory emoji for high percentage
      } else if (roundedPercentage >= 50) {
        wouldTakeAgainEmoji = '😐'; // Neutral emoji for medium percentage
      } else {
        wouldTakeAgainEmoji = '🤡'; // Clown emoji for low percentage
      }
    }

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

    // Create the Main Info Section with color-coded backgrounds and emojis
    const mainInfoSection = `
      <div class="prof-card-main-info">
        <div class="prof-card-detail">
          <span class="prof-card-label">Rating:</span>
          <span class="prof-card-value" style="background-color: ${getAverageRatingColor(details.rating)} !important;">
            ${details.rating || 'N/A'} ${ratingEmoji}
          </span>
        </div>
        <div class="prof-card-detail">
          <span class="prof-card-label">Review(s):</span>
          <span class="prof-card-value" style="background-color: #f0f0f0 !important;">
            ${details.numRatings || 0}
          </span>
        </div>
        <div class="prof-card-detail">
          <span class="prof-card-label">Would Take Again:</span>
          <span class="prof-card-value" style="background-color: ${wouldTakeAgainColor} !important;">
            ${wouldTakeAgainPercentage} ${wouldTakeAgainEmoji}
          </span>
        </div>
        <div class="prof-card-detail">
          <span class="prof-card-label">Difficulty:</span>
          <span class="prof-card-value" style="background-color: ${getDifficultyColor(details.difficulty)} !important;">
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

    // Create the Comments Section with Navigation and Filtering
    const commentsSection = createCommentsSection(details.comments);

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
  tooltip.style.maxWidth = '500px'; // Increased width for better layout
  tooltip.style.wordWrap = 'break-word';

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

// Function to create the comments section with navigation and filtering
function createCommentsSection(comments) {
  // If there are no comments, display a default message
  if (!comments || comments.length === 0) {
    return `<div class="prof-card-comments"><div>No comments available</div></div>`;
  }

  // Extract unique courses from comments
  const uniqueCourses = Array.from(new Set(comments.map(comment => comment.class).filter(Boolean)));

  // Initialize state for comment navigation and filtering
  let filteredComments = comments.slice(); // Clone the comments array
  let currentCommentIndex = 0;

  // Function to render the current comment with individual ratings
  const renderComment = (index) => {
    const comment = filteredComments[index];

    // **Updated "Would Take Again" Display Logic for Individual Comments**
    const wouldTakeAgainText = comment.wouldTakeAgain === 1 ? 'Yes' :
                                comment.wouldTakeAgain === 0 ? 'No' :
                                'N/A';

    return `
      <div class="prof-card-review">
        <div class="prof-card-review-header">
          <div class="prof-card-review-course">${comment.class || 'N/A'}</div>
          <div class="prof-card-review-date">👍${comment.likes || 0} / 👎${comment.dislikes || 0}</div>
        </div>
        <div class="prof-card-review-comment">${comment.comment || 'No comment'}</div>
        <div class="prof-card-review-individual-ratings">
          <span style="background-color: ${getIndividualRatingColor(comment.helpfulRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
            <strong>Helpfulness:</strong> ${comment.helpfulRating !== null ? comment.helpfulRating : 'N/A'}/5
          </span>
          <span style="background-color: ${getIndividualRatingColor(comment.clarityRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
            <strong>Clarity:</strong> ${comment.clarityRating !== null ? comment.clarityRating : 'N/A'}/5
          </span>
          <span style="background-color: ${getIndividualDifficultyColor(comment.difficultyRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
            <strong>Difficulty:</strong> ${comment.difficultyRating !== null ? comment.difficultyRating : 'N/A'}/5
          </span>
          <span style="background-color: ${getWouldTakeAgainColor(comment.wouldTakeAgain)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
            <strong>Would Take Again:</strong> ${wouldTakeAgainText}
          </span>
          <span style="background-color: ${getIndividualGradeColor(comment.grade)} !important; padding: 2px 4px; border-radius: 4px;">
            <strong>Grade:</strong> ${comment.grade !== null ? comment.grade : 'N/A'}
          </span>
        </div>
      </div>
    `;
  };

  // Function to render the course filter dropdown
  const renderCourseFilter = () => {
    if (uniqueCourses.length <= 1) return ''; // No need for filter if only one or zero courses

    const options = uniqueCourses.map(course => `<option value="${course}">${course}</option>`).join('');
    return `
      <div class="course-filter">
        <label for="course-select">Filter by Course:</label>
        <select id="course-select">
          <option value="All">All</option>
          ${options}
        </select>
      </div>
    `;
  };

  // Create the initial comment display
  let commentsHTML = renderComment(currentCommentIndex);

  // If there's more than one comment, add navigation buttons and counter
  if (filteredComments.length > 1) {
    commentsHTML += `
      <div class="comment-navigation">
        <button class="prev-comment" aria-label="Previous Comment">Previous</button>
        <button class="next-comment" aria-label="Next Comment">Next</button>
      </div>
      <div class="comment-counter">${currentCommentIndex + 1} of ${filteredComments.length}</div>
    `;
  }

  // Create the course filter dropdown
  const courseFilterHTML = renderCourseFilter();

  // Return the complete comments section with filtering
  return `
    <div class="prof-card-comments">
      ${courseFilterHTML}
      ${commentsHTML}
    </div>
  `;
}

// Function to handle fetching and displaying professor details
async function handleProfessorDetails(element, name) {
  // Determine the name to use (mapped name if exists)
  const mappedName = nameMappings[cleanExtractedName(name)] || name;

  // Add a thinking emoji as a placeholder
  const thinkingEmoji = document.createElement('span');
  thinkingEmoji.textContent = '⏳'; // Thinking emoji
  thinkingEmoji.style.marginLeft = '8px';
  thinkingEmoji.style.opacity = '0.7'; // Slight transparency to indicate "loading"
  element.appendChild(thinkingEmoji);

  try {
    const details = await fetchProfessorDetails(mappedName);
    thinkingEmoji.remove();

    // Create a rating badge for each professor
    const ratingBadge = document.createElement('span');
    ratingBadge.textContent = details.rating || 'N/A';
    ratingBadge.classList.add('rating-badge');

    // Apply background color based on rating
    const rating = parseFloat(details.rating);
    if (rating >= 0 && rating <= 2.9) {
      ratingBadge.style.backgroundColor = '#ff9c9c'; // Light Red
    } else if (rating >= 3.0 && rating <= 3.9) {
      ratingBadge.style.backgroundColor = '#fff170'; // Light Yellow
    } else if (rating >= 4.0 && rating <= 5.0) {
      ratingBadge.style.backgroundColor = '#7ff6c3'; // Light Green
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
      tooltip.style.top = `${event.pageY + -200}px`;
      tooltip.style.left = `${event.pageX + 40}px`;
      currentTooltip = tooltip.style.display === 'block' ? tooltip : null;

      // If the tooltip has navigation buttons, attach event listeners
      if (details.comments && details.comments.length > 1) {
        attachCommentNavigation(tooltip, details.comments);
      }
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

function attachCommentNavigation(tooltip, comments) {
  const nextButton = tooltip.querySelector('.next-comment');
  const prevButton = tooltip.querySelector('.prev-comment');
  const commentCounter = tooltip.querySelector('.comment-counter');
  const courseSelect = tooltip.querySelector('#course-select');

  if (!nextButton || !prevButton || !commentCounter) return;

  let filteredComments = comments.slice();
  let currentCommentIndex = 0;

  // If courseSelect exists, handle filtering
  if (courseSelect) {
    const uniqueCourses = Array.from(new Set(comments.map(comment => comment.class).filter(Boolean)));

    const handleCourseFilter = () => {
      const selectedCourse = courseSelect.value;
      if (selectedCourse === 'All') {
        filteredComments = comments.slice();
      } else {
        filteredComments = comments.filter(comment => comment.class === selectedCourse);
      }
      currentCommentIndex = 0;
      renderFilteredComments();
    };

    courseSelect.addEventListener('change', handleCourseFilter);
  }

  const updateComment = (newIndex) => {
    if (newIndex < 0 || newIndex >= filteredComments.length) return;
    currentCommentIndex = newIndex;
    const currentComment = filteredComments[currentCommentIndex];

    // Update comment text
    const commentContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-comment');
    if (commentContainer) {
      commentContainer.textContent = currentComment.comment || 'No comment';
    }

    // Update course name
    const courseContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-course');
    if (courseContainer) {
      courseContainer.textContent = currentComment.class || 'N/A';
    }

    // Update likes and dislikes
    const likesDislikesContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-date');
    if (likesDislikesContainer) {
      likesDislikesContainer.textContent = `👍${currentComment.likes || 0} / 👎${currentComment.dislikes || 0}`;
    }

    // Update individual ratings
    const individualRatingsContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-individual-ratings');
    if (individualRatingsContainer) {
      // **Updated "Would Take Again" Display Logic for Individual Comments**
      const wouldTakeAgainText = currentComment.wouldTakeAgain === 1 ? 'Yes' :
                                  currentComment.wouldTakeAgain === 0 ? 'No' :
                                  'N/A';

      individualRatingsContainer.innerHTML = `
        <span style="background-color: ${getIndividualRatingColor(currentComment.helpfulRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Helpfulness:</strong> ${currentComment.helpfulRating !== null ? currentComment.helpfulRating : 'N/A'}/5
        </span>
        <span style="background-color: ${getIndividualRatingColor(currentComment.clarityRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Clarity:</strong> ${currentComment.clarityRating !== null ? currentComment.clarityRating : 'N/A'}/5
        </span>
        <span style="background-color: ${getIndividualDifficultyColor(currentComment.difficultyRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Difficulty:</strong> ${currentComment.difficultyRating !== null ? currentComment.difficultyRating : 'N/A'}/5
        </span>
        <span style="background-color: ${getWouldTakeAgainColor(currentComment.wouldTakeAgain)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Would Take Again:</strong> ${wouldTakeAgainText}
        </span>
        <span style="background-color: ${getIndividualGradeColor(currentComment.grade)} !important; padding: 2px 4px; border-radius: 4px;">
          <strong>Grade:</strong> ${currentComment.grade !== null ? currentComment.grade : 'N/A'}
        </span>
      `;
    }

    // Update comment counter
    commentCounter.textContent = `${currentCommentIndex + 1} of ${filteredComments.length}`;
    
    // Disable/Enable navigation buttons based on current index
    prevButton.disabled = currentCommentIndex === 0;
    nextButton.disabled = currentCommentIndex === filteredComments.length - 1;
  };

  const renderFilteredComments = () => {
    if (filteredComments.length === 0) {
      const commentContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-comment');
      const courseContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-course');
      const likesDislikesContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-date');
      const individualRatingsContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-individual-ratings');

      if (commentContainer) {
        commentContainer.textContent = 'No comments available for the selected course.';
      }
      if (courseContainer) {
        courseContainer.textContent = '';
      }
      if (likesDislikesContainer) {
        likesDislikesContainer.textContent = '';
      }
      if (individualRatingsContainer) {
        individualRatingsContainer.innerHTML = ''; // Clear individual ratings
      }
      if (commentCounter) {
        commentCounter.textContent = '0 of 0';
      }
      prevButton.disabled = true;
      nextButton.disabled = true;
      return;
    }

    // Update the comment display
    const currentComment = filteredComments[currentCommentIndex];
    const commentContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-comment');
    const courseContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-course');
    const likesDislikesContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-date');
    const individualRatingsContainer = tooltip.querySelector('.prof-card-comments .prof-card-review-individual-ratings');

    if (commentContainer) {
      commentContainer.textContent = currentComment.comment || 'No comment';
    }
    if (courseContainer) {
      courseContainer.textContent = currentComment.class || 'N/A';
    }
    if (likesDislikesContainer) {
      likesDislikesContainer.textContent = `👍${currentComment.likes || 0} / 👎${currentComment.dislikes || 0}`;
    }
    if (individualRatingsContainer) {
      // **Updated "Would Take Again" Display Logic for Individual Comments**
      const wouldTakeAgainText = currentComment.wouldTakeAgain === 1 ? 'Yes' :
                                  currentComment.wouldTakeAgain === 0 ? 'No' :
                                  'N/A';

      individualRatingsContainer.innerHTML = `
        <span style="background-color: ${getIndividualRatingColor(currentComment.helpfulRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Helpfulness:</strong> ${currentComment.helpfulRating !== null ? currentComment.helpfulRating : 'N/A'}/5
        </span>
        <span style="background-color: ${getIndividualRatingColor(currentComment.clarityRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Clarity:</strong> ${currentComment.clarityRating !== null ? currentComment.clarityRating : 'N/A'}/5
        </span>
        <span style="background-color: ${getIndividualDifficultyColor(currentComment.difficultyRating)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Difficulty:</strong> ${currentComment.difficultyRating !== null ? currentComment.difficultyRating : 'N/A'}/5
        </span>
        <span style="background-color: ${getWouldTakeAgainColor(currentComment.wouldTakeAgain)} !important; padding: 2px 4px; border-radius: 4px; margin-right: 4px;">
          <strong>Would Take Again:</strong> ${wouldTakeAgainText}
        </span>
        <span style="background-color: ${getIndividualGradeColor(currentComment.grade)} !important; padding: 2px 4px; border-radius: 4px;">
          <strong>Grade:</strong> ${currentComment.grade !== null ? currentComment.grade : 'N/A'}
        </span>
      `;
    }
    if (commentCounter) {
      commentCounter.textContent = `${currentCommentIndex + 1} of ${filteredComments.length}`;
    }

    // Enable or disable buttons based on current index
    prevButton.disabled = currentCommentIndex === 0;
    nextButton.disabled = currentCommentIndex === filteredComments.length - 1;
  };

  // Event listener for Next button
  nextButton.addEventListener('click', () => {
    if (currentCommentIndex < filteredComments.length - 1) {
      updateComment(currentCommentIndex + 1);
    }
  });

  // Event listener for Previous button
  prevButton.addEventListener('click', () => {
    if (currentCommentIndex > 0) {
      updateComment(currentCommentIndex - 1);
    }
  });

  // Initial rendering
  renderFilteredComments();
}

// Main function to process professor elements based on the current site
function processProfessorElements() {
  // Detect current website using the hostname
  const currentSite = window.location.hostname;

  // Define site-specific processing
  if (currentSite.includes('csulb.collegescheduler.com')) {
    processSchedulerSite();
  } else {
    processOtherSite();
  }
}

// Function to process the CSULB Scheduler site
function processSchedulerSite() {
  const schedulerProfessorElements = document.querySelectorAll(
    'td.css-1p12g40-cellCss-hideOnMobileCss'
  );

  // Define weekdays and abbreviations to skip
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const abbreviations = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  schedulerProfessorElements.forEach(async (element) => {
    if (element.dataset.badgeProcessed) {
      return; // Skip already processed elements
    }

    // Check for weekday-related content
    const containsWeekday = Array.from(element.querySelectorAll('span')).some((span) => {
      const ariaLabel = span.getAttribute('aria-label')?.toLowerCase();
      const textContent = span.textContent.trim();
      return (
        weekdays.some((day) => day.toLowerCase() === ariaLabel) || // Full weekday names
        abbreviations.includes(textContent) // Abbreviations
      );
    });

    if (containsWeekday) {
      return;
    }

    // Extract professor names from nested spans
    const professorSpans = element.querySelectorAll('span');
    const professorNames = Array.from(professorSpans)
      .map((span) => span.textContent.trim())
      .filter((name) => {
        // Valid name: must contain letters and not match excluded subjects or pure numbers
        const isValidName = /^(?=.*[A-Za-z])[A-Za-z0-9\s,\-\.\(\)']+$/.test(name);
        const isNotExcluded = !isExcludedName(name);
        return isValidName && isNotExcluded;
      });

    if (professorNames.length === 0) {
      return;
    }

    element.dataset.badgeProcessed = 'true';

    for (const name of professorNames) {
      await handleProfessorDetails(element, name);
    }
  });
}

// Function to process the other site
function processOtherSite() {
  const professorElements = document.querySelectorAll('[id^="MTG_INSTR"]');

  // Define weekdays and abbreviations to skip (if applicable)
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const abbreviations = ['M', 'T', 'W', 'Th', 'F', 'Sa', 'Su'];

  professorElements.forEach(async (element) => {
    // Initialize a Set to track processed names for this element
    const processedNames = new Set();

    if (element.dataset.badgeProcessed) {
      return; // Skip already processed elements
    }

    // Check for weekday-related content
    const containsWeekday = Array.from(element.querySelectorAll('span')).some((span) => {
      const ariaLabel = span.getAttribute('aria-label')?.toLowerCase();
      const textContent = span.textContent.trim();
      return (
        weekdays.some((day) => day.toLowerCase() === ariaLabel) || // Full weekday names
        abbreviations.includes(textContent) // Abbreviations
      );
    });

    if (containsWeekday) {
      return;
    }

    const professorName = element.textContent.trim();

    // Skip invalid names containing "To be Announced" or "TBA"
    if (/^\s*(To be Announced|TBA)\s*$/i.test(professorName)) {
      return;
    }

    // Updated regex to allow hyphens, periods, apostrophes, parentheses, and digits
    const validNameRegex = /^(?=.*[A-Za-z])[A-Za-z0-9\s,\-\.\(\)']+$/;

    if (!validNameRegex.test(professorName)) {
      return;
    }

    // Split names by line breaks (represented by <br> in HTML) and remove trailing commas
    const namesArray = professorName
      .split(/\n|<br\s*\/?>/i) // Split by newline characters or <br> tags
      .map(name => name.replace(/,$/, '').trim()) // Remove trailing commas and trim spaces
      .filter(name => {
        // Exclude "To be Announced" and "TBA" after splitting
        return (
          name.length > 0 && 
          !/^(To be Announced|TBA)$/i.test(name)
        );
      });

    // Deduplicate names (case-insensitive)
    const uniqueNames = Array.from(new Set(namesArray.map(name => name.toLowerCase())))
      .map(lowerName => namesArray.find(name => name.toLowerCase() === lowerName));
    
    // Mark as processed to prevent future duplicate processing
    element.dataset.badgeProcessed = 'true';

    for (const name of uniqueNames) {
      // Avoid processing the same name multiple times for this element
      if (processedNames.has(name.toLowerCase())) {
        continue;
      }
      processedNames.add(name.toLowerCase());
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
const observer = new MutationObserver(() => {
  processProfessorElements();
});

// Start observing for dynamic changes
observer.observe(document.body, { childList: true, subtree: true });

// Initial processing
document.addEventListener('DOMContentLoaded', () => {
  processProfessorElements();
});
