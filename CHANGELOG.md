# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/nivthefox/foundryvtt-aide)
### Fixed
- Resolved an issue where models could be set prematurely. (#1)
- Improved the prompt for text generation.
- Close the active conversation when it is deleted.

## [1.1.0](https://github.com/nivthefox/foundryvtt-aide/releases/tag/1.1.0) - 2024-11-09
### Added
- AIde generation can now be stopped by clicking the input area during generation.
- Added a means to delete messages within a conversation.

### Fixed
- AIde no longer attempts to send a message with every click in the input area.
- Improved the system prompt for a more conversational AI.

## [1.0.0](https://github.com/nivthefox/foundryvtt-aide/releases/tag/1.0.0) - 2024-11-08
### Added
- Initialized the AIde project.
- Added Vector Storage for storing and manipulating document vectors.
- Added an AI Client wrapper for interacting with remote AI services.
- Added support for OpenAI
- Added support for DeepInfra
- Added a placeholder README.
- Added jsmock for mocking in tests.
- Added a document manager to manage operations on documents.
- Added a settings manager to manage settings.
- Added a conversation store to manage conversations.
- Created a Foundry ApplicationV2 to interact with the AI.
- Added context to queries.
