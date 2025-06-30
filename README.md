# Token Export - Figma Plugin

A powerful Figma plugin that exports design tokens, text styles, and shadow effects from your Figma designs into structured JSON format for use in your design systems and development workflows.

## 🎯 Features

- **Design Variables Export**: Extract all Figma variables (colors, numbers, booleans, strings) with their resolved values
- **Text Styles Export**: Export typography styles including font family, size, weight, line height, and letter spacing
- **Shadow Effects Export**: Capture drop shadows and inner shadows with color, offset, blur, and spread values
- **Selective Export**: Choose which tokens to export with an intuitive UI
- **Structured JSON Output**: Clean, organized JSON format ready for design system consumption
- **Real-time Preview**: See all available tokens before exporting

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Figma Desktop App](https://www.figma.com/downloads/) or Figma in browser
- TypeScript knowledge (helpful but not required)

### Installation

1. **Clone or download this repository**
   ```bash
   git clone https://github.com/kaufmanhenry/figma-token-export.git
   cd token-export
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Install TypeScript globally** (if not already installed)
   ```bash
   npm install -g typescript
   ```

4. **Build the plugin**
   ```bash
   npm run build
   ```

### Development

- **Watch mode** (automatically rebuilds on changes):
  ```bash
  npm run watch
  ```

- **Lint code**:
  ```bash
  npm run lint
  ```

- **Fix linting issues**:
  ```bash
  npm run lint:fix
  ```

## 📦 Project Structure

```
token-export/
├── code.ts          # Main plugin logic (Figma API interactions)
├── ui.html          # Plugin UI interface
├── manifest.json    # Plugin configuration
├── package.json     # Dependencies and scripts
├── tsconfig.json    # TypeScript configuration
└── README.md        # This file
```

## 🔧 How It Works

### Core Functionality

The plugin extracts three main types of design tokens:

1. **Variables**: Figma's design variables including:
   - Colors (exported as hex values)
   - Numbers (spacing, sizing, etc.)
   - Booleans (feature flags)
   - Strings (content tokens)

2. **Text Styles**: Typography definitions including:
   - Font family and weight
   - Font size
   - Line height (auto or pixel values)
   - Letter spacing (pixel or percentage)
   - Text decoration and case

3. **Shadow Effects**: Visual effects including:
   - Drop shadows and inner shadows
   - Color values
   - Offset coordinates
   - Blur and spread radius

### Export Format

The plugin generates a structured JSON object:

```json
{
  "variables": {
    "Collection Name": {
      "variable-name": {
        "type": "color|number|boolean|string",
        "value": "#ff0000|16|true|\"example\"",
        "description": "Optional description"
      }
    }
  },
  "textStyles": {
    "style-name": {
      "fontFamily": "Inter",
      "fontSize": 16,
      "fontWeight": 700,
      "lineHeight": "auto",
      "letterSpacing": "0.5%",
      "textDecoration": "none",
      "textCase": "none"
    }
  },
  "shadows": {
    "shadow-name": {
      "type": "dropShadow|innerShadow",
      "color": "#000000",
      "offset": { "x": 0, "y": 4 },
      "blur": 8,
      "spread": 0
    }
  }
}
```

## 🎨 Usage

1. **Open Figma** and navigate to your design file
2. **Run the plugin** from the Plugins menu
3. **Review tokens** in the plugin interface
4. **Select items** you want to export using checkboxes
5. **Click Export** to download the JSON file
6. **Use the JSON** in your design system or development workflow

## 🛠️ Development

### Key Files

- **`code.ts`**: Contains the main plugin logic that interacts with Figma's API
- **`ui.html`**: The user interface for selecting and exporting tokens
- **`manifest.json`**: Plugin metadata and configuration

### API Integration

The plugin uses Figma's Plugin API to:
- Access local variables and collections
- Retrieve text and effect styles
- Resolve variable values for different contexts
- Handle color conversions (RGB to Hex)

### TypeScript

The project uses TypeScript for type safety and better development experience. Key interfaces include:
- `VariableExportData`: Structure for variable exports
- `TextStyleData`: Structure for text style exports
- `ShadowData`: Structure for shadow effect exports
- `ExportData`: Main export structure

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the [Figma Plugin API documentation](https://www.figma.com/plugin-docs/)
2. Review the TypeScript configuration in `tsconfig.json`
3. Ensure all dependencies are properly installed

## 🔄 Version History

- **v1.0.0**: Initial release with variable, text style, and shadow export functionality

---

Built with ❤️ for the Figma community
