// This file is for extending global types, like the window object.
// This allows us to add custom properties to global objects without
// TypeScript complaining that they don't exist.

import { consoleCommands } from './main.js';

declare global {
    interface Window {
        toggleStealthRadius: (towerId: string) => void;
        consoleCommands: typeof consoleCommands;
    }
}