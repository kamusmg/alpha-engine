import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ClerkProvider } from '@clerk/clerk-react';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey="pk_test_YmV0dGVyLW1hcm1vc2V0LTcyLmNsZXJrLmFjY291bnRzLmRldiQ">
      <App />
    </ClerkProvider>
  </React.StrictMode>
);
