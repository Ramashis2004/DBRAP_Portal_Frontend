import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Download, X, LoaderCircle, FileText } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { getUserManualViewUrl, getUserManualDownloadUrl } from "../api/api";
import "./UserManualButton.css";
//import { useMemo } from "react";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();
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
  const [numPages, setNumPages] = useState(null);

useEffect(() => {
  if (open) {
    setNumPages(null);
  }
}, [open]);
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


 const validatedViewUrl = viewUrl || "";
const validatedDownloadUrl = downloadUrl || "";

const urlsInvalid =
  (viewUrl || downloadUrl) &&
  (!validatedViewUrl || !validatedDownloadUrl);


const downloadHref = useMemo(() => {
    if (!validatedDownloadUrl) return "";

    try {
        return new URL(
            validatedDownloadUrl,
            window.location.origin
        ).toString();
    } catch (e) {
        //console.error("Invalid download URL:", validatedDownloadUrl);
        return "";
    }
}, [validatedDownloadUrl]);
  if (!open) return null;

  return createPortal(
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
            {validatedDownloadUrl && (
              <a
                href={downloadHref}
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
              {validatedDownloadUrl && (
                <a href={downloadHref} download="DBRAP_Officer_User_Manual.pdf" className="user-manual-download-btn">
                  <Download size={14} />
                  Download PDF
                </a>
              )}
            </div>
          )}
         {validatedViewUrl && !urlsInvalid && (
  <div className="user-manual-pdf-viewer">
    <Document
  file={validatedViewUrl}
  onLoadSuccess={(pdf) => {
    //console.log("PDF loaded successfully. Pages:", pdf.numPages);
    setNumPages(pdf.numPages);
    onLoad();
  }}
  onLoadError={(err) => {
   // console.error("PDF LOAD ERROR:", err);
    onError();
  }}
  loading={
    <div className="user-manual-modal__state">
      <LoaderCircle
        size={28}
        className="user-manual-modal__spinner"
      />
      <span>Loading manual...</span>
    </div>
  }
  error={
    <div className="user-manual-modal__state user-manual-modal__state--error">
      <FileText
        size={40}
        className="user-manual-modal__error-icon"
      />
      <p>Preview unavailable — please download instead.</p>

      {validatedDownloadUrl && (
        <a
          href={downloadHref}
          download="DBRAP_Officer_User_Manual.pdf"
          className="user-manual-download-btn"
        >
          <Download size={14} />
          Download PDF
        </a>
      )}
    </div>
  }
>
  {Array.from(
    { length: numPages || 0 },
    (_, index) => (
      <Page
        key={`page_${index + 1}`}
        pageNumber={index + 1}
        renderTextLayer={false}
        renderAnnotationLayer={false}
        width={850}
      />
    )
  )}
</Document>
  </div>
)}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Dashboard header button (authenticated — token-stamped URLs) ───────────────
function UserManualButton() {
  const [open, setOpen]         = useState(false);
  const [loaded, setLoaded]     = useState(false);
  const [error, setError]       = useState(false);
  //const [viewUrl, setViewUrl]   = useState("");
 // const [downloadUrl, setDownloadUrl] = useState("");
const validatedViewUrl = useMemo(() => {
    if (!open) return "";

    const url = getUserManualViewUrl();

    if (!isSafeManualUrl(url)) {
        return "";
    }

    return new URL(url, window.location.origin).toString();
}, [open]);

const validatedDownloadUrl = useMemo(() => {
    if (!open) return "";

    const url = getUserManualDownloadUrl();

    if (!isSafeManualUrl(url)) {
        return "";
    }

    return new URL(url, window.location.origin).toString();
}, [open]);
  const openModal = () => {
    setLoaded(false);
    setError(false);
    setOpen(true);
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
    viewUrl={validatedViewUrl}
    downloadUrl={validatedDownloadUrl}
        loaded={loaded}
        error={error}
        onLoad={() => setLoaded(true)}
        onError={() => { setError(true); setLoaded(true); }}
      />
    </>
  );
}

export default UserManualButton;