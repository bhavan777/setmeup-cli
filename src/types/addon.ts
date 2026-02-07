export interface Addon {
  id: string;
  name: string;
  description: string;
  // What changes (for card-style selection UI; extend for future)
  changes: string;
  // Potential files impacted (for UI subtitle)
  filesImpact: string;
  apply: (projectDir: string) => Promise<void>;
}
