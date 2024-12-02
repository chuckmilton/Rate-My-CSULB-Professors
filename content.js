console.log('Content script is running!');

// Function to request professor details from the background script
function fetchProfessorDetails(name) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'fetchProfessorDetails', professorName: name },
      (response) => {
        if (response.success) {
          resolve(response.details);
        } else {
          reject(response.error);
        }
      }
    );
  });
}

// Create a tooltip for detailed data
function createTooltip(details) {
    const tooltip = document.createElement('div');
    tooltip.classList.add('tooltip');
  
    tooltip.innerHTML = `
      <div><strong>Rating:</strong> ${details.rating || "N/A"}</div>
      <div><strong>Would Take Again:</strong> ${details.wouldTakeAgain || "N/A"}%</div>
      <div><strong>Difficulty:</strong> ${details.difficulty || "N/A"}</div>
      <div><strong>Comments:</strong></div>
      <ul>
        ${details.comments.slice(0, 3).map(comment => `<li>${comment}</li>`).join('') || "<li>No comments available</li>"}
      </ul>
      ${
        details.profileLink
          ? `<a href="${details.profileLink}" target="_blank">View Profile on Rate My Professors</a>`
          : "<span>Profile not available</span>"
      }
    `;
  
    tooltip.style.position = 'absolute';
    tooltip.style.display = 'none';
    tooltip.style.backgroundColor = '#333';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '10px';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '14px';
    tooltip.style.zIndex = '1000';
    tooltip.style.maxWidth = '300px';
    tooltip.style.boxShadow = '0px 4px 8px rgba(0, 0, 0, 0.2)';
    document.body.appendChild(tooltip);
  
    return tooltip;
  }
  
  function processProfessorElements() {
    const professorElements = document.querySelectorAll('[id^="MTG_INSTR"]');
    console.log('Found professor elements:', professorElements);
  
    professorElements.forEach(async (element) => {
      if (element.querySelector('.rating-badge')) {
        return;
      }
      const professorName = element.textContent.trim();
  
      // Skip invalid names
      if (!/^[a-zA-Z\s]+$/.test(professorName) || !professorName.includes(' ')) {
        console.log(`Skipping invalid name: ${professorName}`);
        return;
      }
  
      console.log(`Fetching details for: ${professorName}`);
  
      try {
        const details = await fetchProfessorDetails(professorName);
  
        // Create a rating badge
        const ratingBadge = document.createElement('span');
        ratingBadge.textContent = details.rating || "N/A";
        ratingBadge.classList.add('rating-badge');
  
        // Apply background color based on rating
        const rating = parseFloat(details.rating);
        if (rating <= 2.9) {
          ratingBadge.style.backgroundColor = "#ff9c9c"; // Red
        } else if (rating >= 3.0 && rating <= 3.9) {
          ratingBadge.style.backgroundColor = "#fff170"; // Yellow
        } else if (rating >= 4.0 && rating <= 5.0) {
          ratingBadge.style.backgroundColor = "#7ff6c3"; // Green
        } else {
          ratingBadge.style.backgroundColor = '#d3d3d3'; // Default red for N/A or invalid
        }
        ratingBadge.style.color = 'white';
        ratingBadge.style.padding = '2px 6px';
        ratingBadge.style.borderRadius = '4px';
        ratingBadge.style.marginLeft = '8px';
        ratingBadge.style.cursor = 'pointer';
  
        // Add a tooltip
        const tooltip = createTooltip(details);
  
        ratingBadge.addEventListener('click', (event) => {
          event.stopPropagation();
          tooltip.style.display = tooltip.style.display === 'block' ? 'none' : 'block';
          tooltip.style.top = `${event.pageY + 10}px`;
          tooltip.style.left = `${event.pageX + 10}px`;
        });
  
        tooltip.addEventListener('click', (event) => {
          event.stopPropagation(); // Prevent closing when clicking inside tooltip
        });
  
        document.addEventListener('click', () => {
          tooltip.style.display = 'none';
        });
  
        // Append the badge to the professor element
        element.appendChild(ratingBadge);
      } catch (error) {
        console.error(`Error fetching details for ${professorName}:`, error);
      }
    });
  }
  
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
  