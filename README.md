[![Check Actions Status](https://github.com/nivthefox/foundryvtt-aide/workflows/checks/badge.svg)](https://github.com/nivthefox/foundryvtt-aide/actions)
[![Downloads](https://img.shields.io/github/downloads/nivthefox/foundryvtt-aide/latest/module.zip)](https://github.com/nivthefox/foundryvtt-aide/releases/latest)
[![Forge Install %](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Ffoundryvtt-aide&colorB=4aa94a)](https://forge-vtt.com/bazaar#package=foundryvtt-aide)
[![Foundry Hub Endorsements](https://img.shields.io/endpoint?logoColor=white&url=https%3A%2F%2Fwww.foundryvtt-hub.com%2Fwp-json%2Fhubapi%2Fv1%2Fpackage%2Ffoundryvtt-aide%2Fshield%2Fendorsements)](https://www.foundryvtt-hub.com/package/foundryvtt-aide/)
[![Supported Foundry Versions](https://img.shields.io/endpoint?url=https://foundryshields.com/version?url=https://raw.githubusercontent.com/nivthefox/foundryvtt-aide/main/module.json)](https://foundryvtt.com/)

# AIde
AIde brings powerful AI capabilities to your Foundry VTT environment, enabling semantic search and intelligent assistance across your game content.

## Features

### Vector-Based Document Search
- Store and search documents using advanced vector embeddings
- Efficient local storage with automatic persistence
- Support for document chunking and weighted similarity scoring
- Fast in-memory search with background storage sync

### Multi-Vendor AI Integration
- Support for leading AI providers:
  - OpenAI (GPT-4, GPT-3.5)
  - DeepInfra (various open models)
- Unified interface for embeddings and chat generation
- Streaming response support for real-time interactions
- Flexible configuration options for each provider

## Installation

### Method 1: Foundry Package Manager
1. Open the Foundry Package Manager
2. Click "Install Module"
3. Search for "AIde"
4. Click "Install"

### Method 2: Manual Installation
1. Download the [latest release](https://github.com/nivthefox/foundryvtt-aide/releases)
2. Extract the ZIP file
3. Move to your Foundry VTT modules folder
4. Restart Foundry VTT
5. Enable the module in your world settings

## Configuration

### API Keys
To use AIde, you'll need at least one API key from a supported provider:
- [Anthropic API Key](https://www.anthropic.com/api)
- [OpenAI API Key](https://platform.openai.com/api-keys)
- [DeepInfra API Key](https://deepinfra.com/)

Enter your API key(s) in the module settings.

### Vector Storage
Document vectors are automatically stored in your browser's local storage. The storage format is versioned for future compatibility.

## Usage

### Basic Example
```javascript
// Initialize the AI client
const client = Client.create("anthropic", {
  apiKey: "your-api-key"
});

// Get available models
const chatModels = await client.getChatModels();
const embeddingModels = await client.getEmbeddingModels();

// Create document embeddings
const vectors = await client.embed(
  "claude-3-sonnet-20240229-embedding",
  "journal-1",
  ["chunk1 text", "chunk2 text"]
);

// Store vectors for later search
const store = new VectorStore(logger);
store.add(vectors.documentID, vectors.chunks);

// Find similar documents
const results = store.findSimilar(queryVector);
```

### Streaming Example
```javascript
// Generate streaming response
const stream = await client.generate(
  "claude-3-opus-20240229",
  context,
  "Tell me about this area's history",
  true
);

// Process tokens as they arrive
for await (const token of stream) {
  console.log(token);
}
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This module is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for [Foundry VTT](https://foundryvtt.com)
- Supports models from [Anthropic](https://www.anthropic.com), [OpenAI](https://openai.com), and [DeepInfra](https://deepinfra.com)
