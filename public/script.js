document.addEventListener('DOMContentLoaded', () => {
  const chatForm = document.getElementById('chat-form');
  const userInput = document.getElementById('user-input');
  const chatBox = document.getElementById('chat-box');

  let conversationHistory = [];

  /**
   * Converts a basic Markdown-like text to formatted HTML.
   * Handles:
   * - **bold** text
   * - Numbered lists (e.g., 1. item)
   * - Bulleted lists (e.g., * item)
   * - Paragraphs for other lines
   * @param {string} text The plain text to convert.
   * @returns {string} The resulting HTML.
   */
  const markdownToHtml = (text) => {
    const lines = text.trim().split('\n');
    let html = '';
    let list_type = null;

    for (let line of lines) {
      // Handle inline formatting first
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      const ol_match = line.match(/^(\d+)\.\s*(.*)/);
      const ul_match = line.match(/^\*\s*(.*)/);

      if (ol_match) {
        if (list_type !== 'ol') {
          if (list_type) html += `</${list_type}>`; // Close previous list
          html += '<ol>';
          list_type = 'ol';
        }
        html += `<li>${ol_match[2]}</li>`;
      } else if (ul_match) {
        if (list_type !== 'ul') {
          if (list_type) html += `</${list_type}>`; // Close previous list
          html += '<ul>';
          list_type = 'ul';
        }
        html += `<li>${ul_match[1]}</li>`;
      } else {
        if (list_type) {
          html += `</${list_type}>`; // Close any open list
          list_type = null;
        }
        if (line.trim()) {
          html += `<p>${line}</p>`; // Wrap non-list lines in paragraphs
        }
      }
    }

    if (list_type) {
      html += `</${list_type}>`; // Ensure any final list is closed
    }

    return html;
  };


  // Function to add a plain text message to the chat box UI
  const addMessageToBox = (sender, text) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    messageElement.textContent = text; // Use textContent for security (prevents XSS)
    chatBox.appendChild(messageElement);
    return messageElement;
  };

  // Handle form submission
  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userText = userInput.value.trim();
    if (!userText) {
      return;
    }

    // 1. Add user's message to the chat box (as plain text)
    addMessageToBox('user', userText);
    conversationHistory.push({ role: 'user', text: userText });
    userInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // 2. Show a temporary "Thinking..." bot message
    const thinkingMessage = addMessageToBox('bot', 'Thinking...');
    thinkingMessage.id = 'thinking-bubble';
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
      // 3. Send the conversation to the backend
      const response = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversation: conversationHistory }),
      });

      const thinkingBubble = document.getElementById('thinking-bubble');

      if (!response.ok) {
        if (thinkingBubble) {
          thinkingBubble.textContent = 'Failed to get response from server.';
        }
        conversationHistory.pop(); 
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      // 4. Replace "Thinking..." with the AI's reply or an error
      if (thinkingBubble) {
        if (data && data.result) {
          // Convert markdown response to HTML and render it
          const formattedResponse = markdownToHtml(data.result);
          thinkingBubble.innerHTML = formattedResponse;
          conversationHistory.push({ role: 'model', text: data.result });
        } else {
          thinkingBubble.textContent = 'Sorry, no response received.';
          conversationHistory.pop();
        }
        thinkingBubble.removeAttribute('id');
      }
    } catch (error) {
      console.error('Fetch Error:', error);
      const thinkingBubble = document.getElementById('thinking-bubble');
      if (thinkingBubble) {
        thinkingBubble.textContent = 'Failed to get response from server.';
        thinkingBubble.removeAttribute('id');
      }
      if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'user') {
        conversationHistory.pop();
      }
    } finally {
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  });
});
