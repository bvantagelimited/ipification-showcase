# Documentation Index

Welcome to the IPification Showcase documentation. This index provides an overview of all available documentation.

## Documentation Overview

### Getting Started

- **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 5 minutes
- **[README.md](../README.md)** - Complete project documentation and reference

### Technical Documentation

- **[API Documentation](API.md)** - Detailed API endpoint reference
- **[Architecture Documentation](ARCHITECTURE.md)** - System design and architecture details
- **[Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md)** - Field-by-field guide to `config/default.json.sample`
- **[Locale Configuration](LOCALE.md)** - Locale strings and customization guide

## Documentation Structure

```
docs/
├── INDEX.md           # This file - documentation index
├── QUICKSTART.md      # Quick start guide
├── API.md             # API endpoint documentation
├── ARCHITECTURE.md    # Architecture and design documentation
├── CONFIG_DEFAULT_JSON_SAMPLE.md # Sample config field reference
└── LOCALE.md          # Locale configuration and customization guide

README.md              # Main project documentation (in root)
```

## Quick Navigation

### I want to...

**...get started quickly**
→ Read [Quick Start Guide](QUICKSTART.md)

**...understand the project**
→ Read [README.md](../README.md)

**...integrate with the API**
→ Read [API Documentation](API.md)

**...understand the architecture**
→ Read [Architecture Documentation](ARCHITECTURE.md)

**...configure the application**
→ Read [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md)

**...understand the sample config file**
→ Read [Sample Config Reference](CONFIG_DEFAULT_JSON_SAMPLE.md)

**...customize text labels**
→ Read [Locale Configuration](LOCALE.md)

**...deploy the application**
→ See [Docker Deployment section](../README.md#docker-deployment) in README

## Documentation Details

### Quick Start Guide

**File**: `docs/QUICKSTART.md`

**Contents**:
- 5-minute setup instructions
- Prerequisites checklist
- Common issues and solutions
- Testing different flows

**Best for**: First-time users, quick setup

---

### Main README

**File**: `README.md` (root directory)

**Contents**:
- Project overview
- Features list
- Installation instructions
- Configuration guide
- User flows explanation
- API endpoints overview
- Docker deployment
- Development guide
- Troubleshooting

**Best for**: Complete reference, understanding the project

---

### API Documentation

**File**: `docs/API.md`

**Contents**:
- Detailed endpoint documentation
- Request/response formats
- Query parameters
- Status codes
- WebSocket events
- Error handling
- Code examples

**Best for**: API integration, endpoint reference

---

### Architecture Documentation

**File**: `docs/ARCHITECTURE.md`

**Contents**:
- System architecture diagrams
- Component structure
- Data flow diagrams
- Security architecture
- Module structure
- Performance considerations
- Extension points

**Best for**: Understanding system design, extending the application

---

### Sample Config Reference

**File**: `docs/CONFIG_DEFAULT_JSON_SAMPLE.md`

**Contents**:
- How to copy and apply the sample config
- Field-by-field descriptions
- Client flow configuration fields
- Locale override fields

**Best for**: Understanding and customizing `config/default.json.sample`

---

### Locale Configuration

**File**: `docs/LOCALE.md`

**Contents**:
- Locale file structure
- Override mechanism
- Deep merging behavior
- Usage examples
- Troubleshooting guide

**Best for**: Customizing UI text labels, internationalization setup

## Documentation Conventions

### Code Examples

All code examples use:
- **bash** for shell commands
- **json** for configuration files
- **javascript** for code snippets

### Diagrams

Architecture diagrams use ASCII art format for universal compatibility.

### Links

- Internal links use relative paths
- External links open in new tabs (when applicable)

## Contributing to Documentation

When updating documentation:

1. Keep examples up-to-date with code changes
2. Update all affected documentation files
3. Test code examples before committing
4. Follow existing documentation style
5. Update this index if adding new documentation files

## Documentation Updates

**Last Updated**: [Current Date]

**Version**: 1.1.17-SNAPSHOT

**Maintainer**: Development Team

## Feedback

For documentation feedback or improvements:
- Create an issue in the repository
- Submit a pull request with improvements
- Contact the development team
