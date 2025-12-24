// PS2 Emulator - Play! WebAssembly Integration
// Based on the Play! PS2 emulator compiled to WebAssembly

export interface PS2EmulatorState {
  isLoaded: boolean;
  isRunning: boolean;
  fps: number;
  error: string | null;
}

export interface PlayModule {
  FS: {
    mkdir: (path: string) => void;
    open: (path: string, mode: string) => number;
    write: (stream: number, data: Uint8Array, offset: number, length: number, position: number) => void;
    close: (stream: number) => void;
  };
  HEAPU8: Uint8Array;
  ccall: (name: string, returnType: string, argTypes: string[], args: unknown[]) => unknown;
  discImageDevice: DiscImageDevice;
  bootElf: (fileName: string) => void;
  bootDiscImage: (fileName: string) => void;
  getFrames: () => number;
  clearStats: () => void;
}

export class DiscImageDevice {
  private module: PlayModule;
  private doneFlag: boolean;
  private file: File | null;

  constructor(module: PlayModule) {
    this.module = module;
    this.doneFlag = false;
    this.file = null;
  }

  read(dstPtr: number, offset: number, size: number): void {
    if (!this.file) {
      throw new Error("No file set.");
    }
    this.doneFlag = false;
    const subsection = this.file.slice(offset, offset + size);
    subsection.arrayBuffer().then((value: ArrayBuffer) => {
      this.module.HEAPU8.set(new Uint8Array(value), dstPtr);
      this.doneFlag = true;
    });
  }

  getFileSize(): number {
    if (!this.file) {
      throw new Error("No file set.");
    }
    return this.file.size;
  }

  isDone(): boolean {
    return this.doneFlag;
  }

  setFile(file: File): void {
    this.file = file;
  }
}

let playModule: PlayModule | null = null;
let isInitializing = false;
let initPromise: Promise<PlayModule> | null = null;

// Configure the module before loading
function configureModule(): void {
  if (typeof window === "undefined") return;

  const baseURL = window.location.origin;
  const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement | null;

  (window as unknown as Record<string, unknown>).Module = {
    canvas: canvas,
    locateFile: (path: string) => {
      if (path.endsWith(".wasm")) return `${baseURL}/Play.wasm`;
      if (path.endsWith(".worker.js")) return `${baseURL}/Play.worker.js`;
      return path;
    },
    print: console.log,
    printErr: console.error,
  };
}

// Check if SharedArrayBuffer is available (requires cross-origin isolation)
function checkCrossOriginIsolation(): { available: boolean; reason?: string } {
  if (typeof window === "undefined") {
    return { available: false, reason: "Not in browser environment" };
  }

  // Check if the page is cross-origin isolated
  if (!crossOriginIsolated) {
    return {
      available: false,
      reason: "Page is not cross-origin isolated. The server must send Cross-Origin-Embedder-Policy: require-corp and Cross-Origin-Opener-Policy: same-origin headers.",
    };
  }

  // Check if SharedArrayBuffer is available
  if (typeof SharedArrayBuffer === "undefined") {
    return {
      available: false,
      reason: "SharedArrayBuffer is not available in this browser or environment.",
    };
  }

  return { available: true };
}

// Initialize the PS2 emulator
export async function initPS2Emulator(): Promise<PlayModule> {
  if (playModule) return playModule;
  if (initPromise) return initPromise;

  // Check for cross-origin isolation first
  const isolation = checkCrossOriginIsolation();
  if (!isolation.available) {
    throw new Error(isolation.reason || "SharedArrayBuffer not available");
  }

  isInitializing = true;

  initPromise = new Promise<PlayModule>(async (resolve, reject) => {
    try {
      const baseURL = window.location.origin;

      // Configure the Module global before loading Play.js
      configureModule();

      // Try to dynamically import Play.js as ES module first
      let Play: ((overrides: Record<string, unknown>) => Promise<PlayModule>) | null = null;

      try {
        // Modern ES module import
        const PlayModule = await import(/* webpackIgnore: true */ `${baseURL}/Play.js`);
        Play = PlayModule.default;
      } catch {
        // Fallback: Load via script tag and get from window
        await new Promise<void>((scriptResolve, scriptReject) => {
          const script = document.createElement("script");
          script.src = `${baseURL}/Play.js`;
          script.type = "module";
          script.onload = () => {
            setTimeout(scriptResolve, 500); // Give it time to execute
          };
          script.onerror = () => scriptReject(new Error("Failed to load Play.js"));
          document.head.appendChild(script);
        });

        Play = (window as unknown as Record<string, unknown>).Play as typeof Play;
      }

      if (!Play) {
        throw new Error("Play module not found after loading");
      }

      const canvas = document.getElementById("outputCanvas") as HTMLCanvasElement;

      const moduleOverrides = {
        canvas: canvas,
        locateFile: (path: string) => {
          return `${baseURL}/${path}`;
        },
        mainScriptUrlOrBlob: `${baseURL}/Play.js`,
        print: console.log,
        printErr: console.error,
      };

      playModule = await Play(moduleOverrides);
      playModule.FS.mkdir("/work");
      playModule.discImageDevice = new DiscImageDevice(playModule);
      playModule.ccall("initVm", "", [], []);

      isInitializing = false;
      resolve(playModule);
    } catch (error) {
      isInitializing = false;
      console.error("PS2 Emulator initialization error:", error);
      reject(error);
    }
  });

  return initPromise;
}

// Boot a file (ELF or disc image)
export async function bootPS2File(file: File): Promise<void> {
  if (!playModule) {
    throw new Error("PS2 emulator not initialized");
  }

  const fileName = file.name;
  const fileDotPos = fileName.lastIndexOf(".");

  if (fileDotPos === -1) {
    throw new Error("File name must have an extension.");
  }

  const fileExtension = fileName.substring(fileDotPos).toLowerCase();

  if (fileExtension === ".elf") {
    // Load ELF file
    const url = URL.createObjectURL(file);
    const response = await fetch(url);

    if (!response.ok) {
      URL.revokeObjectURL(url);
      throw new Error("Failed to load ELF file");
    }

    const blob = await response.blob();
    const data = new Uint8Array(await blob.arrayBuffer());
    const stream = playModule.FS.open(fileName, "w+");
    playModule.FS.write(stream, data, 0, data.length, 0);
    playModule.FS.close(stream);
    URL.revokeObjectURL(url);
    playModule.bootElf(fileName);
  } else {
    // Load disc image (ISO, BIN, etc.)
    playModule.discImageDevice.setFile(file);
    playModule.bootDiscImage(fileName);
  }
}

// Get current FPS
export function getPS2Fps(): number {
  if (!playModule) return 0;
  return playModule.getFrames();
}

// Clear stats
export function clearPS2Stats(): void {
  if (playModule) {
    playModule.clearStats();
  }
}

// Check if emulator is loaded
export function isPS2EmulatorLoaded(): boolean {
  return playModule !== null;
}

// Check if emulator is initializing
export function isPS2EmulatorInitializing(): boolean {
  return isInitializing;
}

// Check if cross-origin isolation is enabled (required for PS2 emulator)
export function isCrossOriginIsolated(): boolean {
  if (typeof window === "undefined") return false;
  return crossOriginIsolated && typeof SharedArrayBuffer !== "undefined";
}

// Expose boot function globally for external access
if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).bootPs2File = async (file: File) => {
    if (!playModule) {
      await initPS2Emulator();
    }
    await bootPS2File(file);
  };
}

