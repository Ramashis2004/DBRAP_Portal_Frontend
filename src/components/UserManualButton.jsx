import { useState, useEffect } from "react";
import { BookOpen, Download, X, LoaderCircle, FileText } from "lucide-react";
import { getUserManualViewUrl, getUserManualDownloadUrl } from "../api/api";
import "./UserManualButton.css";

// ── URL allow-list validation (Fortify: Open Redirect remediation) ─────────
// Never trust a constructed URL as a redirect/navigation target. Instead of
// using the URL directly, verify it matches an expected, known-safe pattern
// before it is ever assigned to href/src. This is the "level of indirection"
// approach Fortify recommends: reject anything that isn't on the allow-list
// rather than trying to sanitize/rewrite an untrusted value.
const ALLOWED_MANUAL_PATH_PREFIXES = [
  "/api/user-manual/view",
  "/api/user-manual/download",
  "/api/user-manual/public/view",
  "/api/user-manual/public/download",
];

function isSafeManualUrl(candidate) {
  if (!candidate || typeof candidate !== "string") return false;

  try {
    
    const resolved = new URL(candidate, window.location.origin);

    
    if (resolved.origin !== window.location.origin) return false;

    
    return ALLOWED_MANUAL_PATH_PREFIXES.some((prefix) =>
      resolved.pathname.startsWith(prefix)
    );
  } catch {
    // Not a parseable URL at all — reject.
    return false;
  }
}

// ── Shared modal — used by both dashboard button and landing page card ────────
export function UserManualModal({ open, onClose, viewUrl, downloadUrl, loaded, error, onLoad, onError }) {
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

 
  const safeViewUrl = isSafeManualUrl(viewUrl) ? viewUrl : "";
  const safeDownloadUrl = isSafeManualUrl(downloadUrl) ? downloadUrl : "";
  const urlsInvalid = (viewUrl || downloadUrl) && (!safeViewUrl || !safeDownloadUrl);

  return (
    <div
      className="user-manual-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="User Manual"
    >
      <div className="user-manual-modal">
        {/* Header */}
        <div className="user-manual-modal__header">
          <div className="user-manual-modal__header-left">
            <div className="user-manual-modal__icon">
              <FileText size={16} />
            </div>
            <div className="user-manual-modal__title-group">
              <p className="user-manual-modal__title">DBRAP Portal — User Manual</p>
              <p className="user-manual-modal__subtitle">Click × to close</p>
            </div>
          </div>
          <div className="user-manual-modal__header-actions">
            {safeDownloadUrl && (
              <a
                href={safeDownloadUrl}
                download="DBRAP_Applicant_User_Manual.pdf"
                className="user-manual-download-btn"
              >
                <Download size={14} />
                Download PDF
              </a>
            )}
            <button
              type="button"
              className="user-manual-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="user-manual-modal__body">
          {!loaded && !error && !urlsInvalid && (
            <div className="user-manual-modal__state">
              <LoaderCircle size={28} className="user-manual-modal__spinner" />
              <span>Loading manual...</span>
            </div>
          )}
          {(error || urlsInvalid) && (
            <div className="user-manual-modal__state user-manual-modal__state--error">
              <FileText size={40} className="user-manual-modal__error-icon" />
              <p>Preview unavailable — please download instead.</p>
              {safeDownloadUrl && (
                <a href={safeDownloadUrl} download="DBRAP_Officer_User_Manual.pdf" className="user-manual-download-btn">
                  <Download size={14} />
                  Download PDF
                </a>
              )}
            </div>
          )}
          {safeViewUrl && !urlsInvalid && (
            <iframe
              src={`${safeViewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
              title="User Manual PDF Preview"
              className={`user-manual-modal__iframe${loaded && !error ? " is-loaded" : ""}`}
              onLoad={onLoad}
              onError={onError}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard header button (authenticated — token-stamped URLs) ───────────────
function UserManualButton() {
  const [open, setOpen]         = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [error, setError]       = useState(false);
  const [viewUrl, setViewUrl]   = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");

  const openModal = () => {
    const rawViewUrl = getUserManualViewUrl();
    const rawDownloadUrl = getUserManualDownloadUrl();

    // Validate at the source, as soon as the URLs are produced, so an
    // unvalidated value never even makes it into component state.
    setViewUrl(isSafeManualUrl(rawViewUrl) ? rawViewUrl : "");
    setDownloadUrl(isSafeManualUrl(rawDownloadUrl) ? rawDownloadUrl : "");
    setOpen(true);
    setLoaded(false);
    setError(!isSafeManualUrl(rawViewUrl) || !isSafeManualUrl(rawDownloadUrl));
  };

  return (
    <>
      <button
        type="button"
        className="user-manual-trigger"
        onClick={openModal}
        title="View User Manual"
      >
        {/* <BookOpen size={14} className="user-manual-trigger__icon" /> */}
        <span>User Manual</span>
        <Download size={20} className="user-manual-trigger__download-icon" />
      </button>

      <UserManualModal
        open={open}
        onClose={() => setOpen(false)}
        viewUrl={viewUrl}
        downloadUrl={downloadUrl}
        loaded={loaded}
        error={error}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
      />
    </>
  );
}

export default UserManualButton;
