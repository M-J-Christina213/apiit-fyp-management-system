import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./config/msalConfig";
import './index.css'
import App from './App.jsx'

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL instance before rendering
msalInstance.initialize().then(() => {
  // Required for MSAL to process the token when redirecting back to the app in a popup or redirect flow
  msalInstance.handleRedirectPromise().catch(e => {
    console.error("MSAL Redirect Error:", e);
  });

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  )
});
