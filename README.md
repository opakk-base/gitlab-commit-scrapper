# GitLab Commit Scraper

An Electron desktop application for scraping GitLab commits and generating AI-powered summaries. This tool helps teams analyze commit activity across multiple GitLab projects and create comprehensive reports.

## Features

- **GitLab Integration**: Connect to any GitLab instance (GitLab.com or self-hosted)
- **Multi-Project Scraping**: Select and scrape commits from multiple projects simultaneously
- **Branch Filtering**: Filter commits by branch across selected projects
- **Date Range Selection**: Specify date ranges for commit scraping
- **File Change Details**: Optionally include diff information for better AI context
- **AI Summarization**: Generate intelligent summaries using OpenAI-compatible LLM APIs
- **Customizable Prompts**: Edit system and user prompts for tailored summaries
- **Export Options**: Export summaries as TXT, CSV, PDF, or DOCX

## Screenshots

The application includes the following main sections:

- **Dashboard**: Overview and navigation
- **Commit Scraper**: Project selection, branch filtering, and scraping controls
- **Scrape Results**: View scraped commits with details
- **Commit Summary**: AI-generated summaries with export options
- **GitLab Settings**: Configure GitLab connection
- **LLM Settings**: Configure AI/LLM API settings
- **Settings**: Application preferences

## Prerequisites

- Node.js 16+ and npm
- GitLab Personal Access Token with `read_api` and `read_repository` scopes
- OpenAI-compatible API key (for AI summaries)

## Installation

```bash
# Clone the repository
git clone https://github.com/opakk-base/gitlab-commit-scrapper.git

# Navigate to the project directory
cd gitlab-commit-scrapper

# Install dependencies
npm install
```

## Development

```bash
# Start the application in development mode
npm start

# Package the application
npm run package

# Create distributable installers
npm run make
```

## Configuration

### GitLab Settings

1. Navigate to **GitLab Settings** in the app
2. Enter your GitLab instance URL (e.g., `https://gitlab.com` or your self-hosted URL)
3. Provide your Personal Access Token (PAT)
4. Click **Test Connection** to verify
5. Save the configuration

**Creating a GitLab PAT**:
- Go to GitLab → User Settings → Access Tokens
- Create a token with `read_api` and `read_repository` scopes

### LLM Settings

1. Navigate to **LLM Settings** in the app
2. Configure the API URL (default: `https://api.openai.com/v1`)
3. Enter your API key
4. Select or enter the model name (e.g., `gpt-3.5-turbo`, `gpt-4`)
5. Test the connection
6. Save the configuration

**Supported APIs**:
- OpenAI API
- Any OpenAI-compatible API (Ollama, LM Studio, etc.)
- Custom endpoints supporting the `/chat/completions` endpoint

## Usage

### Scraping Commits

1. Go to **Commit Scraper**
2. Select projects from the list (loaded from your GitLab instance)
3. Optionally select a branch filter
4. Set date range (Since/Until) if needed
5. Toggle "Include File Changes" for detailed diffs
6. Set max commits per project
7. Click **Scrape Commits**
8. View results in **Scrape Results**

### Generating Summaries

1. After scraping, go to **Commit Summary**
2. Review commit statistics (total commits, contributors, projects, files changed)
3. Optionally edit custom prompts for tailored summaries
4. Click **Generate Summary**
5. View the AI-generated markdown summary
6. Export to desired format (TXT, CSV, PDF, DOCX)

### Custom Prompts

You can customize both the system prompt and user prompt template:

- **System Prompt**: Defines the AI's role and behavior
- **User Prompt Template**: Uses `{{commitCount}}` and `{{commits}}` placeholders

Default prompts analyze commit patterns, identify key changes, and provide actionable insights.

## Export Formats

- **TXT**: Plain text summary
- **CSV**: Spreadsheet-compatible format
- **PDF**: Formatted document with headers and styling
- **DOCX**: Microsoft Word document with proper formatting

## Tech Stack

- **Electron**: Desktop application framework
- **Electron Forge**: Build and packaging tooling
- **React**: UI components
- **TypeScript**: Type-safe development
- **Webpack**: Module bundling
- **Tailwind CSS**: Styling
- **React Router**: Navigation
- **React Markdown**: Markdown rendering

### Key Dependencies

| Package | Purpose |
|---------|---------|
| `react-markdown` | Render AI summaries in markdown |
| `jspdf` | PDF export generation |
| `docx` | Word document export |
| `file-saver` | File download handling |
| `html2canvas` | Screenshot capture for exports |

## Project Structure

```
my-new-app/
├── src/
│   ├── App.tsx              # Main app with routing
│   ├── Main.tsx             # Electron main process
│   ├── preload.ts           # Electron preload script
│   ├── renderer.ts          # React entry point
│   ├── index.html           # HTML template
│   ├── index.css            # Global styles
│   ├── components/
│   │   ├── Layout.tsx       # Navigation layout
│   │   └ ErrorDisplay.tsx   # Error handling component
│   ├── pages/
│   │   ├── Dashboard.tsx    # Dashboard view
│   │   ├── CommitScraper.tsx # Scraper interface
│   │   ├── ScrapeResults.tsx # Results display
│   │   ├── CommitSummary.tsx # Summary generation
│   │   ├── GitLabSettings.tsx # GitLab config
│   │   ├── LLMSettings.tsx  # LLM config
│   │   └ Settings.tsx       # App settings
│   └── services/
│       ├── gitlab.ts        # GitLab API integration
│       ├── llm.ts           # LLM API integration
│       ├── scraper.ts       # Scraping logic & storage
│       ├── settings.ts      # Settings management
│       └ export.ts          # Export functionality
├── forge.config.ts          # Electron Forge config
├── webpack.*.config.ts      # Webpack configurations
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies & scripts
└── .eslintrc.json           # Linting rules
```

## API Integration

### GitLab API

Uses GitLab REST API v4 endpoints:

- `GET /user` - Verify authentication
- `GET /version` - Get GitLab version
- `GET /projects` - List user's projects
- `GET /projects/:id/repository/branches` - List branches
- `GET /projects/:id/repository/commits` - List commits
- `GET /projects/:id/repository/commits/:sha/diff` - Get commit diffs

### LLM API

Uses OpenAI-compatible chat completions endpoint:

- `GET /models` - List available models
- `POST /chat/completions` - Generate summary

## Error Handling

The application includes comprehensive error handling for:

- Network connectivity issues
- Authentication failures (401)
- Permission errors (403)
- Resource not found (404)
- Rate limiting (429)
- Server errors (5xx)

Debug mode can be enabled in Settings to view detailed error information.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run linting: `npm run lint`
5. Submit a pull request

## License

MIT License - See [LICENSE](LICENSE) for details.

## Author

**Rizal** - dickyarisya@yahoo.com

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/opakk-base/gitlab-commit-scrapper/issues) page.