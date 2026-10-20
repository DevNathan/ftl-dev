import { SymbolKind } from "./symbols";

/** Matches `vscode.SymbolKind` numeric values (@types/vscode 1.85). */
export function symbolKindToVscode(kind: SymbolKind): number {
  switch (kind) {
    case "macro":
      return 5; // Method
    case "function":
      return 11; // Function
    case "assign":
    case "local":
    case "global":
    default:
      return 12; // Variable
  }
}
