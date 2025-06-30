// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// Token Export Plugin - Main Code
// This plugin exports design tokens and styles from Figma to JSON

interface VariableExportData {
  type: 'color' | 'number' | 'boolean' | 'string';
  value: string | number | boolean;
  description?: string;
}

interface TextStyleData {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: string | number;
  letterSpacing: string | number;
  textDecoration?: string;
  textCase?: string;
}

interface ShadowData {
  type: 'dropShadow' | 'innerShadow';
  color: string;
  offset: { x: number; y: number };
  blur: number;
  spread?: number;
}

interface ExportData {
  variables: {
    [collectionName: string]: {
      [variableName: string]: VariableExportData;
    };
  };
  textStyles: {
    [styleName: string]: TextStyleData;
  };
  shadows: {
    [styleName: string]: ShadowData;
  };
}

// Convert RGB color to hex
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert RGBA color to hex
function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
}

// Extract color from shadow effect
function extractShadowColor(effect: DropShadowEffect | InnerShadowEffect): string {
  const { r, g, b } = effect.color;
  const alpha = effect.visible !== false ? 1 : 0;
  return alpha < 1 ? rgbaToHex(r, g, b, alpha) : rgbToHex(r, g, b);
}

// Collect variables - properly resolving values
async function collectVariables(): Promise<ExportData['variables']> {
  const variables: ExportData['variables'] = {};
  
  // Create a temporary frame to use as consumer for variable resolution
  const tempFrame = figma.createFrame();
  
  // Get all variable collections
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  
  for (const collection of collections) {
    const collectionName = collection.name;
    variables[collectionName] = {};
    
    // Get all variables in this collection
    const variablePromises = collection.variableIds.map(id => 
      figma.variables.getVariableByIdAsync(id)
    );
    const collectionVariables = (await Promise.all(variablePromises)).filter(Boolean);
    
    for (const variable of collectionVariables) {
      if (!variable) continue;
      
      const variableName = variable.name;
      let value: string | number | boolean = '';
      let type: VariableExportData['type'] = 'string';
      
      // Get the resolved value for this variable using the temporary frame
      const resolvedValue = variable.resolveForConsumer(tempFrame);
      
      switch (variable.resolvedType) {
        case 'COLOR': {
          type = 'color';
          if (resolvedValue && typeof resolvedValue.value === 'object' && 'r' in resolvedValue.value) {
            const color = resolvedValue.value as { r: number; g: number; b: number; a: number };
            value = rgbaToHex(color.r, color.g, color.b, color.a);
          } else {
            value = '#000000'; // Fallback
          }
          break;
        }
        case 'FLOAT': {
          type = 'number';
          if (typeof resolvedValue.value === 'number') {
            value = resolvedValue.value;
          } else {
            value = 0; // Fallback
          }
          break;
        }
        case 'BOOLEAN': {
          type = 'boolean';
          if (typeof resolvedValue.value === 'boolean') {
            value = resolvedValue.value;
          } else {
            value = false; // Fallback
          }
          break;
        }
        case 'STRING': {
          type = 'string';
          if (typeof resolvedValue.value === 'string') {
            value = resolvedValue.value;
          } else {
            value = ''; // Fallback
          }
          break;
        }
      }
      
      variables[collectionName][variableName] = {
        type,
        value,
        description: variable.description || undefined
      };
    }
  }
  
  // Clean up the temporary frame
  tempFrame.remove();
  
  return variables;
}

// Collect text styles
async function collectTextStyles(): Promise<ExportData['textStyles']> {
  const textStyles: ExportData['textStyles'] = {};
  
  const styles = await figma.getLocalTextStylesAsync();
  
  styles.forEach(style => {
    const styleName = style.name;
    const fontName = style.fontName as FontName;
    
    // Handle line height properly
    let lineHeight: string | number;
    if (style.lineHeight.unit === 'AUTO') {
      lineHeight = 'auto';
    } else {
      lineHeight = style.lineHeight.value;
    }
    
    // Handle letter spacing properly
    let letterSpacing: string | number;
    if (style.letterSpacing.unit === 'PIXELS') {
      letterSpacing = style.letterSpacing.value;
    } else {
      letterSpacing = `${style.letterSpacing.value}%`;
    }
    
    textStyles[styleName] = {
      fontFamily: fontName.family,
      fontSize: style.fontSize,
      fontWeight: fontName.style.toLowerCase().includes('bold') ? 700 : 
                  fontName.style.toLowerCase().includes('medium') ? 500 : 400,
      lineHeight,
      letterSpacing,
      textDecoration: style.textDecoration,
      textCase: style.textCase
    };
  });
  
  return textStyles;
}

// Collect shadow/effect styles
async function collectShadows(): Promise<ExportData['shadows']> {
  const shadows: ExportData['shadows'] = {};
  
  const styles = await figma.getLocalEffectStylesAsync();
  
  styles.forEach(style => {
    const styleName = style.name;
    
    // Only process shadow effects
    const shadowEffects = style.effects.filter(effect => 
      effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW'
    );
    
    if (shadowEffects.length > 0) {
      // For now, take the first shadow effect
      const effect = shadowEffects[0] as DropShadowEffect | InnerShadowEffect;
      
      shadows[styleName] = {
        type: effect.type === 'DROP_SHADOW' ? 'dropShadow' : 'innerShadow',
        color: extractShadowColor(effect),
        offset: {
          x: effect.offset.x,
          y: effect.offset.y
        },
        blur: effect.radius,
        spread: effect.spread
      };
    }
  });
  
  return shadows;
}

// Main plugin logic
figma.showUI(__html__, { width: 800, height: 600 });

// Collect all data
async function initializePlugin() {
  const exportData: ExportData = {
    variables: await collectVariables(),
    textStyles: await collectTextStyles(),
    shadows: await collectShadows()
  };


  // Send data to UI
  figma.ui.postMessage({
    type: 'export-data',
    data: exportData
  });
}

initializePlugin();

// Listen for export request from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === 'export-selected') {
    // The UI will handle the actual file download
    // We just need to send the selected data back
    figma.ui.postMessage({
      type: 'export-ready',
      data: msg.selectedData
    });
  }
};
