// generate-examples.js
const fs = require('fs');
const path = require('path');

const modulesToProcess = [
  { name: './forever-chat-imessage-export/modules/getSimplifiedMessages', functions: ['getSimplifiedMessages'] },
  { name: './forever-chat-imessage-export/modules/highCharMessages', functions: ['getHighCharMessages'] },
  { name: './forever-chat-imessage-export/modules/messageFiltering', functions: [
      'filterMessagesByParticipant', 
      'filterMessagesByDateRange', 
      'filterMessagesByText', 
      'getMessagesWithAttachments'
    ]},
  { name: './forever-chat-imessage-export/modules/countMessagesPerDay', functions: ['countMessagesPerDay'] },
];

// Mock data generator for each function
function getMockInput(moduleName, funcName) {
  // Customize mock data per function
  if (moduleName.includes('getSimplifiedMessages') && funcName === 'getSimplifiedMessages') {
    return {
      messages: [
        {
          is_from_me: 1,
          message_text: "Hello, this is a sample message",
          message_segments: [],
          date: "2023-01-01T12:00:00Z",
          date_read: null,
          attachments: []
        },
        {
          is_from_me: 0,
          message_text: "Reply message here",
          message_segments: [],
          date: "2023-01-01T12:05:00Z",
          date_read: null,
          attachments: []
        }
      ]
    };
  }

  if (moduleName.includes('highCharMessages') && funcName === 'getHighCharMessages') {
    // It expects simplified messages
    return [
      {
        message_text: "A".repeat(350),
        direction: 1,
        date: "2023-07-15T15:30:00Z"
      },
      {
        message_text: "Short message",
        direction: 0,
        date: "2023-07-15T16:00:00Z"
      }
    ];
  }

  if (moduleName.includes('messageFiltering')) {
    // Sample messages for filtering
    const sampleMessages = [
      {
        message_text: "Hello",
        sender: "+1234567890",
        participants: ["+1234567890", "+0987654321"],
        date: "2023-01-01T10:00:00Z",
        is_from_me: 1,
        attachments: []
      },
      {
        message_text: "Hi",
        sender: "+0987654321",
        participants: ["+1234567890", "+0987654321"],
        date: "2023-01-02T11:00:00Z",
        is_from_me: 0,
        attachments: []
      }
    ];

    switch (funcName) {
      case 'filterMessagesByParticipant':
        return [sampleMessages[0]]; // Filter by '+1234567890'
      case 'filterMessagesByDateRange':
        return sampleMessages;
      case 'filterMessagesByText':
        return sampleMessages;
      case 'getMessagesWithAttachments':
        return [sampleMessages[0]]; // No attachments, but you'll adjust as needed
      default:
        return [];
    }
  }

  if (moduleName.includes('countMessagesPerDay') && funcName === 'countMessagesPerDay') {
    // Sample messages with dates
    return [
      { date: "2023-01-01T12:00:00Z" },
      { date: "2023-01-01T15:00:00Z" },
      { date: "2023-01-02T09:00:00Z" }
    ];
  }

  // Fallback empty object
  return {};
}

// Function to save JSON to file
function saveOutput(fileName, data) {
  const outputPath = path.join(__dirname, 'examples', fileName);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`Output written to ${outputPath}`);
}

// Main execution
(async () => {
  for (const moduleInfo of modulesToProcess) {
    const modulePath = path.join(__dirname, 'forever-chat-imessage-export', moduleInfo.name);
    const mod = require(modulePath);

    for (const funcName of moduleInfo.functions) {
      if (typeof mod[funcName] === 'function') {
        const inputData = getMockInput(moduleInfo.name, funcName);
        let output;
        try {
          output = await mod[funcName](inputData);
        } catch (err) {
          output = { error: err.toString() };
        }

        const fileName = `${moduleInfo.name.replace(/\//g, '_')}_${funcName}.json`;
        saveOutput(fileName, output);
      }
    }
  }
})();
