
// Modal functions for text and headings
function openTextModal(content, index, type = 'text') {
  const modal = document.getElementById('textModal');
  const modalContent = document.getElementById('textModalContent');
  const prevBtn = document.getElementById('prevTextBtn');
  const nextBtn = document.getElementById('nextTextBtn');
  
  // Set content
  modalContent.innerHTML = content;
  
  // Add appropriate class based on content type
  modalContent.className = 'text-modal-content ' + type + '-type';
  
  // Update current index
  currentTextIndex = index;
  
  // Update navigation buttons state
  updateModalNavButtons();
  
  // Show modal with animation but without moving background content
  modal.style.display = 'flex';
  
  // Don't disable body scrolling to keep background content scrollable
  // document.body.style.overflow = 'hidden'; // Removed to keep scrolling enabled
  
  // Short delay for smoother animation
  requestAnimationFrame(() => {
    modal.classList.add('show');
    modal.classList.remove('hide');
  });
}

function closeTextModal() {
  const modal = document.getElementById('textModal');
  
  // Hide with animation
  modal.classList.remove('show');
  modal.classList.add('hide');
  
  setTimeout(() => {
    modal.style.display = 'none';
    // No need to restore body overflow as we're not disabling it
  }, 500); // Match the animation duration (0.5s)
}

function updateModalNavButtons() {
  const prevBtn = document.getElementById('prevTextBtn');
  const nextBtn = document.getElementById('nextTextBtn');
  
  // Disable/enable previous button
  prevBtn.disabled = currentTextIndex <= 0;
  
  // Disable/enable next button
  nextBtn.disabled = currentTextIndex === -1 || currentTextIndex >= currentTextItems.length - 1;
}

function navigateTextModal(direction) {
  if (currentTextIndex === -1 || currentTextItems.length === 0) return;
  
  // Calculate new index
  const newIndex = currentTextIndex + direction;
  
  // Check boundaries
  if (newIndex < 0 || newIndex >= currentTextItems.length) return;
  
  const item = currentTextItems[newIndex];
  let content = '';
  let type = 'text'; // Default type
  
  // Generate content based on item type
  if (item.type === "text") {
    if (item.rich_text) {
      content = renderNotionRichText(item.rich_text);
    } else {
      content = item.content;
    }
  } else if (item.type === "heading_1" || item.type === "heading_2" || item.type === "heading_3") {
    type = 'heading'; // Set type to heading
    const headingContent = item.rich_text ? renderNotionRichText(item.rich_text) : item.content;
    content = '<' + item.type.replace("_", "") + '>' + headingContent + '</' + item.type.replace("_", "") + '>';
  }
  
  // Open modal with new content
  openTextModal(content, newIndex, type);
}