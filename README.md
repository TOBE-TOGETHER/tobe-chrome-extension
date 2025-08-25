# TOBE Chrome Extension

A powerful Chrome extension designed to improve daily work efficiency with three core tools: **JSON Formatter**, **Screenshot Tool**, and **Timestamp Converter**.

## 🚀 Features

### 📸 Screenshot Tool
- **Visible Tab Capture**: Capture the entire visible area of the current tab
- **Area Selection**: Click and drag to select specific areas for screenshot
- **In-page Preview**: Preview screenshots directly on the page with dark overlay
- **Quick Actions**: Download or copy screenshots to clipboard
- **Keyboard Support**: Press ESC to cancel selection or close preview

### 📄 JSON Formatter
- **Dedicated Page**: Full-featured JSON formatting in a dedicated tab
- **Syntax Highlighting**: Color-coded JSON with collapsible/expandable structure
- **Fixed Input Window**: Convenient input area in the top-right corner
- **Format Controls**: Expand all, collapse all, and copy formatted JSON
- **Real-time Validation**: Instant error detection and formatting

### ⏰ Timestamp Converter
- **Bidirectional Conversion**: Convert timestamps to dates and vice versa
- **Multiple Formats**: Support for both seconds and milliseconds
- **Current Time Display**: Real-time current timestamp and date
- **Quick Copy**: Copy current timestamp with one click
- **Keyboard Shortcuts**: Press Enter to convert timestamps

## 🛠️ Technical Features

### Architecture
- **Manifest V3**: Modern Chrome extension architecture
- **Service Worker**: Background script for image processing
- **Content Scripts**: Page interaction for screenshot selection
- **Modular Design**: Organized file structure with separate HTML, CSS, and JS directories

### UI/UX Design
- **Tab-based Interface**: Clean, organized popup with tab navigation
- **Responsive Design**: Adapts to different screen sizes
- **Unified Theme**: Consistent color scheme and styling across all components
- **Common Styles**: Shared CSS variables and utility classes
- **Modern Icons**: SVG icons for better scalability

### Performance
- **Efficient Image Processing**: Uses OffscreenCanvas for cropping
- **Memory Management**: Proper cleanup of event listeners and resources
- **Error Handling**: Robust error handling with user-friendly messages
- **Storage Management**: Local storage for screenshot data

## 📁 Project Structure

```
tobe-chrome-extension/
├── manifest.json              # Extension configuration
├── package.json               # Project metadata
├── README.md                  # This file
├── test-popup.html           # Test environment for popup
├── html/                     # HTML files
│   ├── popup.html            # Main popup interface
│   └── json-format.html      # Dedicated JSON formatter page
├── js/                       # JavaScript files
│   ├── background.js         # Service worker for background tasks
│   ├── popup.js             # Popup logic and tab management
│   ├── content.js           # Content script for page interaction
│   └── json-format.js       # JSON formatter functionality
├── css/                      # Stylesheets
│   ├── common.css           # Shared styles and theme variables
│   ├── popup.css            # Popup-specific styles
│   ├── json-format.css      # JSON formatter styles
│   └── content.css          # Content script styles
└── icons/                    # Extension icons
    ├── icon16.png           # 16x16 icon
    ├── icon48.png           # 48x48 icon
    └── icon128.png          # 128x128 icon
```

## 🚀 Installation

### Method 1: Load Unpacked Extension (Development)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/tobe-chrome-extension.git
   cd tobe-chrome-extension
   ```

2. **Open Chrome Extensions**:
   - Navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)

3. **Load the extension**:
   - Click "Load unpacked"
   - Select the `tobe-chrome-extension` folder

4. **Verify installation**:
   - The extension should appear in your extensions list
   - Click the extension icon in the toolbar to test

### Method 2: Install from Chrome Web Store (Future)

*Coming soon - the extension will be available on the Chrome Web Store*

## 📖 Usage Guide

### Screenshot Tool

#### Visible Tab Capture
1. Click the extension icon to open the popup
2. In the Screenshot tab, click "Visible Tab"
3. The screenshot will be captured and displayed in the preview area
4. Click the image to download it

#### Area Selection
1. Click "Select Area" or click the preview area
2. The mouse cursor will change to a crosshair
3. Click and drag to select the area you want to capture
4. Release to capture the selected area
5. Use the in-page toolbar to download or copy the screenshot
6. Press ESC to cancel at any time

### JSON Formatter

1. Click the "JSON Formatter" tab in the popup
2. A new tab will open with the dedicated JSON formatter
3. Paste your JSON in the input window (top-right corner)
4. Click "Format" to format and display the JSON
5. Use the toolbar buttons to:
   - Expand all levels
   - Collapse all levels
   - Copy formatted JSON

### Timestamp Converter

1. Click the "Timestamp" tab in the popup
2. **Convert Timestamp to Date**:
   - Enter a timestamp (seconds or milliseconds)
   - Click "Convert" or press Enter
   - View the converted date and time
3. **Convert Date to Timestamp**:
   - Select a date and time
   - Click "Convert"
   - View the resulting timestamp
4. **Current Time**:
   - View current timestamp and date
   - Click "Copy Timestamp" to copy current timestamp

## 🎨 Customization

### Theme Colors
The extension uses CSS variables for theming. You can customize colors by modifying `css/common.css`:

```css
:root {
  --primary-color: #667eea;
  --secondary-color: #764ba2;
  --success-color: #28a745;
  --danger-color: #dc3545;
  /* ... more variables */
}
```

### Styling
- **Common styles**: `css/common.css` contains shared styles and variables
- **Component styles**: Each component has its own CSS file
- **Responsive design**: Media queries for different screen sizes

## 🔧 Development

### Prerequisites
- Node.js >= 14.0.0
- Chrome browser

### Development Setup
1. Clone the repository
2. Load as unpacked extension in Chrome
3. Make changes to the code
4. Reload the extension in `chrome://extensions/`

### Testing
- Use `test-popup.html` for testing popup functionality without Chrome APIs
- Test on different websites for screenshot functionality
- Verify JSON formatting with various JSON structures

### File Organization
- **HTML**: UI structure and markup
- **CSS**: Styling and theming
- **JS**: Logic and functionality
- **Icons**: Extension icons in multiple sizes

## 🐛 Troubleshooting

### Common Issues

#### Screenshot not working
- Ensure the extension has necessary permissions
- Try refreshing the page
- Check if the page is accessible (some pages like `chrome://` are restricted)

#### JSON formatter not opening
- Check if popup blockers are enabled
- Verify the extension is properly loaded
- Check browser console for errors

#### Timestamp conversion errors
- Ensure input format is correct
- Check if the timestamp is within valid range
- Verify date input format

### Debug Mode
1. Open Chrome DevTools
2. Go to the Extensions tab
3. Find the TOBE extension
4. Click "background page" to debug the service worker
5. Check console for error messages

## 📝 Changelog

### Version 1.0.0
- ✅ Initial release with three core features
- ✅ Screenshot tool with area selection
- ✅ JSON formatter with syntax highlighting
- ✅ Timestamp converter with bidirectional conversion
- ✅ Modern UI with tab-based interface
- ✅ Keyboard shortcuts and ESC key support
- ✅ Responsive design and unified theming

## 🙏 Acknowledgments

- Chrome Extension Manifest V3 documentation
- Modern CSS techniques and best practices
- SVG icons and design inspiration

## 📞 Support

If you encounter any issues or have questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the Chrome extension documentation

---

**Made with ❤️ by the TOBE Team**