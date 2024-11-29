import { defineConfig } from 'vite';

// Configure Vite for your project
export default defineConfig({
  // If you're hosting the app under a subdirectory (e.g., /splazooma)
  base: '/',  // Adjust if deploying to a sub-path (e.g., '/splazooma/')

  // Server settings for development
  server: {
    port: 5173,        // Set the port for the local development server
    open: true,        // Automatically open the browser when the dev server starts
    hmr: true,         // Enable Hot Module Replacement
  },

  // Build configurations for production
  build: {
    outDir: 'dist',    // Output directory for production builds
    assetsDir: 'assets',  // Directory to store static assets like images, fonts, etc.
    manifest: true,    // Create a manifest file to link the build assets for server-side rendering or advanced configurations
  },

  // Configure Vite plugins (e.g., for React, Vue, etc.)
  plugins: [
    // Add plugins here if needed (for example, if using React or Vue)
  ],
});
