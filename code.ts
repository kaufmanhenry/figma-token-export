// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

// Token Export Plugin - Main Code
// This plugin exports design tokens and styles from Figma to JSON

interface VariableExportData {
  type: "color" | "number" | "boolean" | "string";
  value: string | number | boolean | { aliasTo: string };
  description?: string;
}

interface TextStyleData {
  fontFamily: string | { aliasTo: string };
  fontSize: number | { aliasTo: string };
  fontWeight: number | { aliasTo: string };
  lineHeight: string | number | { aliasTo: string };
  letterSpacing: string | number | { aliasTo: string };
  textDecoration?: string;
  textCase?: string;
}

interface ShadowData {
  type: "dropShadow" | "innerShadow";
  color: string | { aliasTo: string };
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
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// Convert RGBA color to hex
function rgbaToHex(r: number, g: number, b: number, a: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}${toHex(a)}`;
}

// Extract color from shadow effect
function extractShadowColor(
  effect: DropShadowEffect | InnerShadowEffect
): string {
  const { r, g, b } = effect.color;
  const alpha = effect.visible !== false ? 1 : 0;
  return alpha < 1 ? rgbaToHex(r, g, b, alpha) : rgbToHex(r, g, b);
}

// Collect variables - properly resolving values
async function collectVariables(): Promise<ExportData["variables"]> {
  const variables: ExportData["variables"] = {};
  const tempFrame = figma.createFrame();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  // Build a map of all variables by id for fast lookup
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const variableIdToName: Record<string, string> = {};
  allVariables.forEach((v) => {
    variableIdToName[v.id] = v.name;
  });

  for (const collection of collections) {
    const collectionName = collection.name;
    variables[collectionName] = {};
    const variablePromises = collection.variableIds.map((id) =>
      figma.variables.getVariableByIdAsync(id)
    );
    const collectionVariables = (await Promise.all(variablePromises)).filter(
      Boolean
    );
    for (const variable of collectionVariables) {
      if (!variable) continue;
      const variableName = variable.name;
      let value: string | number | boolean | { aliasTo: string } = "";
      let type: VariableExportData["type"] = "string";
      // Get the resolved value for this variable using the temporary frame
      const resolvedValue = variable.resolveForConsumer(tempFrame);
      // Check if the value is an alias/reference for the default mode
      // (for simplicity, use the first mode in the collection)
      const firstModeId = collection.modes[0]?.modeId;
      const valuesByMode: Record<string, unknown> =
        (variable as unknown as { valuesByMode?: Record<string, unknown> })
          .valuesByMode || {};
      let isAlias = false;
      const modeValue = firstModeId ? valuesByMode[firstModeId] : undefined;
      if (
        modeValue &&
        typeof modeValue === "object" &&
        "type" in modeValue &&
        (modeValue as { type: string }).type === "VARIABLE_ALIAS" &&
        "id" in modeValue
      ) {
        const refId = (modeValue as { id: string }).id;
        const refName = variableIdToName[refId] || refId;
        value = { aliasTo: refName };
        isAlias = true;
        // Try to infer type from referenced variable
        const refVar = allVariables.find((v) => v.id === refId);
        if (refVar) {
          switch (refVar.resolvedType) {
            case "COLOR":
              type = "color";
              break;
            case "FLOAT":
              type = "number";
              break;
            case "BOOLEAN":
              type = "boolean";
              break;
            case "STRING":
              type = "string";
              break;
          }
        }
      }
      if (!isAlias) {
        switch (variable.resolvedType) {
          case "COLOR": {
            type = "color";
            if (
              resolvedValue &&
              typeof resolvedValue.value === "object" &&
              "r" in resolvedValue.value
            ) {
              const color = resolvedValue.value as {
                r: number;
                g: number;
                b: number;
                a: number;
              };
              value = rgbaToHex(color.r, color.g, color.b, color.a);
            } else {
              value = "#000000";
            }
            break;
          }
          case "FLOAT": {
            type = "number";
            if (typeof resolvedValue.value === "number") {
              value = resolvedValue.value;
            } else {
              value = 0;
            }
            break;
          }
          case "BOOLEAN": {
            type = "boolean";
            if (typeof resolvedValue.value === "boolean") {
              value = resolvedValue.value;
            } else {
              value = false;
            }
            break;
          }
          case "STRING": {
            type = "string";
            if (typeof resolvedValue.value === "string") {
              value = resolvedValue.value;
            } else {
              value = "";
            }
            break;
          }
        }
      }
      variables[collectionName][variableName] = {
        type,
        value,
        description: variable.description || undefined,
      };
    }
  }
  tempFrame.remove();
  return variables;
}

// Collect text styles
async function collectTextStyles(): Promise<ExportData["textStyles"]> {
  const textStyles: ExportData["textStyles"] = {};
  const styles = await figma.getLocalTextStylesAsync();
  // Build a map of all variables by id for fast lookup
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const variableIdToName: Record<string, string> = {};
  allVariables.forEach((v) => {
    variableIdToName[v.id] = v.name;
  });

  styles.forEach((style) => {
    const styleName = style.name;
    const fontName = style.fontName as FontName;
    // Type guard for variable alias
    function isVariableAlias(
      obj: unknown
    ): obj is { type: string; id: string } {
      return (
        typeof obj === "object" &&
        obj !== null &&
        "type" in obj &&
        (obj as { type: string }).type === "VARIABLE_ALIAS" &&
        "id" in obj &&
        typeof (obj as { id: unknown }).id === "string"
      );
    }
    // Helper to resolve a bound variable reference
    function resolveAlias<T extends string | number>(
      bound: unknown,
      fallback: T
    ): T | { aliasTo: string } {
      if (isVariableAlias(bound)) {
        const refName = variableIdToName[bound.id] || bound.id;
        return { aliasTo: refName };
      }
      return fallback;
    }
    // Check for variable references in boundVariables
    const bv: Record<string, unknown> =
      (style as unknown as { boundVariables?: Record<string, unknown> })
        .boundVariables || {};
    // Font Family
    let fontFamily: string | { aliasTo: string } = fontName.family;
    if (bv.fontFamily) {
      fontFamily = resolveAlias(
        Array.isArray(bv.fontFamily) ? bv.fontFamily[0] : bv.fontFamily,
        fontName.family
      );
    }
    // Font Size
    let fontSize: number | { aliasTo: string } = style.fontSize;
    if (bv.fontSize) {
      fontSize = resolveAlias(
        Array.isArray(bv.fontSize) ? bv.fontSize[0] : bv.fontSize,
        style.fontSize
      );
    }
    // Font Weight
    let fontWeight: number | { aliasTo: string } = fontName.style
      .toLowerCase()
      .includes("bold")
      ? 700
      : fontName.style.toLowerCase().includes("medium")
      ? 500
      : 400;
    if (bv.fontWeight) {
      fontWeight = resolveAlias(
        Array.isArray(bv.fontWeight) ? bv.fontWeight[0] : bv.fontWeight,
        fontWeight
      );
    }
    // Line Height
    let lineHeight: string | number | { aliasTo: string };
    if (style.lineHeight.unit === "AUTO") {
      lineHeight = "auto";
    } else {
      lineHeight = style.lineHeight.value;
    }
    if (bv.lineHeight) {
      lineHeight = resolveAlias(
        Array.isArray(bv.lineHeight) ? bv.lineHeight[0] : bv.lineHeight,
        lineHeight
      );
    }
    // Letter Spacing
    let letterSpacing: string | number | { aliasTo: string };
    if (style.letterSpacing.unit === "PIXELS") {
      letterSpacing = style.letterSpacing.value;
    } else {
      letterSpacing = `${style.letterSpacing.value}%`;
    }
    if (bv.letterSpacing) {
      letterSpacing = resolveAlias(
        Array.isArray(bv.letterSpacing)
          ? bv.letterSpacing[0]
          : bv.letterSpacing,
        letterSpacing
      );
    }
    textStyles[styleName] = {
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight,
      letterSpacing,
      textDecoration: style.textDecoration,
      textCase: style.textCase,
    };
  });
  return textStyles;
}

// Collect shadow/effect styles
async function collectShadows(): Promise<ExportData["shadows"]> {
  const shadows: ExportData["shadows"] = {};
  const styles = await figma.getLocalEffectStylesAsync();
  // Build a map of all variables by id for fast lookup
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const variableIdToName: Record<string, string> = {};
  allVariables.forEach((v) => {
    variableIdToName[v.id] = v.name;
  });

  function isVariableAliasColor(
    obj: unknown
  ): obj is { type: string; variableId: string } {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "type" in obj &&
      (obj as { type: string }).type === "VARIABLE_ALIAS" &&
      "variableId" in obj &&
      typeof (obj as { variableId: unknown }).variableId === "string"
    );
  }

  styles.forEach((style) => {
    const styleName = style.name;
    // Only process shadow effects
    const shadowEffects = style.effects.filter(
      (effect) =>
        effect.type === "DROP_SHADOW" || effect.type === "INNER_SHADOW"
    );
    if (shadowEffects.length > 0) {
      // For now, take the first shadow effect
      const effect = shadowEffects[0] as DropShadowEffect | InnerShadowEffect;
      // Check for variable reference in effect.color (Figma stores variable alias as a special object)
      let color: string | { aliasTo: string } = extractShadowColor(effect);
      // Try to detect variable alias for color
      if (isVariableAliasColor(effect.color)) {
        const refId = effect.color.variableId;
        const refName = variableIdToName[refId] || refId;
        color = { aliasTo: refName };
      }
      shadows[styleName] = {
        type: effect.type === "DROP_SHADOW" ? "dropShadow" : "innerShadow",
        color,
        offset: {
          x: effect.offset.x,
          y: effect.offset.y,
        },
        blur: effect.radius,
        spread: effect.spread,
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
    shadows: await collectShadows(),
  };

  // Send data to UI
  figma.ui.postMessage({
    type: "export-data",
    data: exportData,
  });
}

initializePlugin();

// Listen for export request from UI
figma.ui.onmessage = (msg) => {
  if (msg.type === "export-selected") {
    // The UI will handle the actual file download
    // We just need to send the selected data back
    figma.ui.postMessage({
      type: "export-ready",
      data: msg.selectedData,
    });
  }
};
