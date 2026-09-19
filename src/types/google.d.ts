// Minimal shape for the Google Identity Services script loaded in
// index.html (https://accounts.google.com/gsi/client) -- just enough
// to type Auth.tsx's usage, not a full definition of Google's API.
export {};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: { client_id: string; callback: (response: { credential: string }) => void }): void;
          renderButton(
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'small' | 'medium' | 'large';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              width?: number;
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
            },
          ): void;
        };
      };
    };
  }
}
