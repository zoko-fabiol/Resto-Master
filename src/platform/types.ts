export interface SaveFileOptions {
  filename: string;
  mimeType: string;
  data: Uint8Array;
}

export interface SaveFileResult {
  path: string;
}

export interface PrintDocumentOptions {
  title?: string;
  html?: string;
}

export interface PrintResult {
  target: 'system' | 'native';
}

export interface PlatformFiles {
  save(options: SaveFileOptions): Promise<SaveFileResult>;
}

export interface PlatformPrinting {
  printRaw(
    data: Uint8Array,
    target?: { printerId?: string; host?: string; port?: number }
  ): Promise<PrintResult>;
  printDocument(options?: PrintDocumentOptions): Promise<PrintResult>;
}

export interface PlatformClipboard {
  write(text: string): Promise<void>;
}

export interface PlatformScreen {
  keepAwake(enabled: boolean): Promise<void>;
}

export interface PlatformLinks {
  open(url: string): Promise<void>;
}

export interface PlatformBackButton {
  subscribe(callback: () => void): Promise<() => void>;
}

export interface Platform {
  files: PlatformFiles;
  printing: PlatformPrinting;
  clipboard: PlatformClipboard;
  screen: PlatformScreen;
  links: PlatformLinks;
  backButton: PlatformBackButton;
}
