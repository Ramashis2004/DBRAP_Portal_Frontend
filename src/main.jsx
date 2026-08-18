import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const XOR_KEY = "dbrap_secure_storage_key_2026";

export const secureStorage = {
  encrypt(value) {
    if (value === null || value === undefined) return value;
    const strValue = typeof value === "string" ? value : JSON.stringify(value);
    
    // Convert to UTF-8 bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(strValue);
    
    // XOR obfuscation
    const xorBytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      xorBytes[i] = bytes[i] ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
    }
    
    // Convert bytes to binary string safely
    let binary = "";
    for (let i = 0; i < xorBytes.length; i++) {
      binary += String.fromCharCode(xorBytes[i]);
    }
    
    // Convert to base64 and prepend SECURE:
    return "SECURE:" + window.btoa(binary);
  },
  
  decrypt(value) {
    if (typeof value !== "string" || !value.startsWith("SECURE:")) {
      return value;
    }
    
    try {
      const base64Data = value.substring(7); // Remove "SECURE:"
      const binary = window.atob(base64Data);
      
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length);
      }
      
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch (e) {
      console.error("Decryption failed", e);
      return value; // fallback to original value
    }
  }
};

// Global overrides for localStorage to handle encryption/decryption transparently
const originalSetItem = Storage.prototype.setItem;
const originalGetItem = Storage.prototype.getItem;

const targetKeys = ["applicantSession", "officerSession"];

Storage.prototype.setItem = function (key, value) {
  if (targetKeys.includes(key) && value !== null && value !== undefined) {
    if (typeof value === "string" && value.startsWith("SECURE:")) {
      originalSetItem.call(this, key, value);
    } else {
      const encryptedValue = secureStorage.encrypt(value);
      originalSetItem.call(this, key, encryptedValue);
    }
  } else {
    originalSetItem.call(this, key, value);
  }
};

Storage.prototype.getItem = function (key) {
  const value = originalGetItem.call(this, key);
  if (targetKeys.includes(key) && value !== null && value !== undefined) {
    if (typeof value === "string" && value.startsWith("SECURE:")) {
      return secureStorage.decrypt(value);
    }
  }
  return value;
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);