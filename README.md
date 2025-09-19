# Dune Scraper

<div align="center">

<img src="https://raw.githubusercontent.com/exyreams/Dune-Scraper/17c9c8efcbe45eb0a36bfdbdf87c1c0b9c0543cd/assets/icon.svg" alt="Dune Scraper Logo" width="120" height="120">

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()
[![Chrome Extension](https://img.shields.io/badge/platform-Chrome%20Extension-yellow.svg)]()

**Professional Chrome Extension for Dune Analytics Data Scraping**

</div>

## 🎯 Overview

Dune Scraper is a sophisticated Chrome extension designed for seamless data extraction from Dune Analytics dashboards. Built with a modern UI and intelligent automation, it provides professional-grade data scraping capabilities with smart duplicate detection and automatic pagination.

## ⚠️ Important Usage Limitations

> [!WARNING]
> This extension is designed for smaller data extraction tasks only (5,000-7,000 rows maximum)
>
> - **Connection Timeout**: Dune Analytics will disconnect if the scraper runs for extended periods
> - **Optimal Use Case**: Best suited for quick data exports and smaller datasets
> - **Not Recommended**: Large tables or extensive data scraping operations
> - **Session Management**: Close and restart scraping sessions periodically to maintain connection

## ✨ Key Features

### 🔧 Core Functionality

- **Smart Table Detection**: Automatically identifies and extracts data from Dune Analytics tables
- **Intelligent Pagination**: Seamlessly navigates through multiple pages with configurable delays (3-5 seconds)
- **Duplicate Detection**: Advanced hash-based algorithm prevents duplicate data collection
- **Real-time Progress Tracking**: Live statistics showing pages processed, rows collected, and duplicates found
- **Export Flexibility**: Support for both CSV and JSON formats with metadata

### 🎨 Modern UI Design

- **Professional Interface**: Clean, dark theme using Tailwind color palette
- **Right-side Panel**: Non-intrusive scraper panel that doesn't interfere with Dune's interface
- **Premium Typography**: Audiowide font for titles, Mulish for body text
- **Animated Feedback**: Smooth transitions and progress indicators
- **Responsive Controls**: Intuitive start/stop functionality with visual status updates

### 🛡️ Smart Operation

- **Manual Control**: Extension only operates when explicitly started by user
- **Page Validation**: Automatically detects if you're on a valid Dune Analytics page
- **Error Handling**: Robust error management with user-friendly feedback
- **Memory Efficient**: Optimized performance with minimal resource usage

## 🚀 Installation

### Prerequisites

- Google Chrome (Latest version recommended)
- Access to Dune Analytics (dune.com or dune.xyz)

### Steps

1. **Download**: Clone or download this repository

   ```bash
   git clone [repository-url]
   cd dunescraper
   ```

2. **Load Extension**:

   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked" and select the project folder
   - The Dune Scraper icon should appear in your extensions toolbar

3. **Verify Installation**:
   - Navigate to any Dune Analytics dashboard
   - Click the extension icon to open the popup
   - You should see the "Open Scraper Panel" button

## 📖 Usage Guide

### Getting Started

1. **Navigate to Dune**: Open any Dune Analytics dashboard with data tables
2. **Launch Extension**: Click the Dune Scraper icon in your Chrome toolbar
3. **Open Panel**: Click "Open Scraper Panel" to launch the side panel
4. **Configure Settings**: Select your preferred export format (CSV/JSON)
5. **Start Scraping**: Click "Start Scraping" to begin data collection

### Understanding the Interface

#### Popup Window

- **Logo & Title**: Professional branding with Dune Scraper logo
- **Main Button**: Opens the scraper panel on the current page
- **Quick Start Guide**: Step-by-step instructions
- **Feature Highlights**: Key capabilities overview

#### Scraper Panel

- **Header**: Logo, title, and close button with proper contrast
- **Export Format**: Dropdown to choose between CSV and JSON
- **Control Buttons**: Start/Stop scraping with visual feedback
- **Status Display**: Real-time updates on scraping progress
- **Progress Bar**: Visual indicator of current operation
- **Statistics Grid**: Live counters for pages, rows, and duplicates

### Advanced Features

#### Smart Duplicate Detection

- Uses SHA-based hashing to identify duplicate rows
- Works across multiple pages and sessions
- Displays duplicate count in real-time statistics

#### Automatic Pagination

- Intelligently finds and clicks "Next" buttons
- Configurable wait times (3-5 seconds) between pages
- Handles various Dune Analytics table layouts
- Stops automatically when no more pages are available

#### Export Options

- **CSV Format**: Clean, comma-separated values with proper escaping
- **JSON Format**: Structured data with metadata including source URL and timestamp
- **Automatic Download**: Files are automatically saved to your Downloads folder
- **Timestamped Filenames**: Prevents file conflicts with ISO timestamp naming

## 🔧 Technical Specifications

### Architecture

- **Manifest Version**: 3 (Latest Chrome Extension standard)
- **Core Technology**: Vanilla JavaScript (ES6+)
- **UI Framework**: Custom CSS with Google Fonts integration
- **Storage**: Chrome Storage API for settings persistence
- **Permissions**: Minimal required permissions for security

### File Structure

```
dunescraper/
├── manifest.json          # Extension configuration
├── popup.html            # Main popup interface
├── popup.js              # Popup functionality
├── content.js            # Core scraping logic
├── background.js         # Service worker
├── assets/               # Icons and images
│   ├── icon.svg         # Main logo
│   └── icon*.png        # Various icon sizes
└── README.md            # This file
```

### Browser Compatibility

- **Chrome**: Version 88+ (Manifest V3 support)
- **Edge**: Chromium-based versions
- **Other Browsers**: Not currently supported

## 🎨 Design System

### Color Palette

- **Primary Background**: `#0f1419` (Dark)
- **Secondary Background**: `#1a1f2e` (Lighter Dark)
- **Primary Text**: `#e1e5f2` (Light)
- **Secondary Text**: `#8b9dc3` (Muted)
- **Accent Primary**: `#00bfff` (Bright Blue)
- **Border Color**: `rgba(0, 191, 255, 0.2)` (Subtle Blue)

### Typography

- **Titles**: Audiowide (Google Fonts)
- **Body Text**: Mulish (Google Fonts)
- **Weights**: 300, 400, 500, 600, 700

## 🛠️ Development

### Local Development

1. Make changes to the source files
2. Reload the extension in `chrome://extensions/`
3. Test on live Dune Analytics pages
4. Use browser DevTools for debugging

### Key Components

- **Content Script**: Handles page interaction and data extraction
- **Popup Script**: Manages the extension popup interface
- **Background Script**: Minimal service worker for extension lifecycle
- **Styles**: Embedded CSS with animations and responsive design

### Configuration

Settings are stored in Chrome's sync storage and include:

- Export format preference (CSV/JSON)
- Wait time configuration
- Debug mode toggle

## 🔒 Privacy & Security

- **Minimal Permissions**: Only requests necessary permissions
- **Local Processing**: All data processing happens locally
- **No External Servers**: No data is sent to external services
- **User Control**: All operations require explicit user action

## 🐛 Troubleshooting

### Common Issues

**Extension doesn't appear**

- Ensure Developer mode is enabled in Chrome extensions
- Refresh the extensions page after loading

**"Not on Dune Analytics" message**

- Navigate to dune.com or dune.xyz
- Ensure the URL contains the Dune domain

**Panel won't open**

- Refresh the Dune Analytics page
- Try disabling and re-enabling the extension
- Check browser console for error messages

**Scraping stops unexpectedly**

- Check if pagination buttons are available
- Verify table data is fully loaded
- Look for any error messages in the panel

### Debug Mode

Enable debug mode in the extension settings to see detailed console logs for troubleshooting.

## 📝 Changelog

### Version 2.0.0

- Complete UI redesign with professional Tailwind theme
- Enhanced logo integration and improved contrast
- Restructured panel layout with status below export controls
- Added smart duplicate detection with real-time statistics
- Improved close button visibility and hover effects
- Updated typography with Audiowide and Mulish fonts
- Enhanced progress tracking with animated indicators

### Version 1.0.0

- Initial release with basic scraping functionality
- CSV and JSON export support
- Manual pagination control

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Guidelines

- Follow existing code style and conventions
- Test thoroughly on multiple Dune Analytics pages
- Update documentation for any new features
- Ensure compatibility with Chrome Extension Manifest V3

## 📄 License

MIT License - see LICENSE file for details

## 👥 Author

**Exyreams Development Team**

- Professional blockchain data tools
- Advanced web scraping solutions
- Chrome extension development

---

_For support or questions, please open an issue in the repository._
