import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Download, X, LoaderCircle, FileText, ArrowLeft, Eye, Calendar } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  fetchPublicNotifications,
  getPublicNotificationViewUrl,
  getPublicNotificationDownloadUrl,
} from "../api/api";
import "./UserManualButton.css";

// Idempotent worker configuration
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// ── Official Notification Details Mapped to PDF File Numbers ─────────────────
const getNotificationInfo = (item, index) => {
  const str = `${item.filename || ""} ${item.label || ""} ${item.subject || ""}`.toLowerCase();

  // 1. Citizen Charter PDF (11938)
  if (str.includes("11938") || str.includes("charter")) {
    return {
      subject: "Citizen Charter for Rural Water Supply",
      date: "02/05/2026",
      fileNo: "Letter No. 11938/PR&DW",
      filename: item.filename || "11938.pdf"
    };
  }

  // 2. DBRAP Compliance PDF (24314)
  if (str.includes("24314") || str.includes("dbrap") || str.includes("compliance")) {
    return {
      subject: "Compliance of reform requirements under District Business Reforms Action Plan (DBRAP) 2025-26 – Water Supply Connection service - reg.",
      date: "28/08/2026",
      fileNo: "File No. PR-DWS-MISC-0006-2026 / 24314/PR&DW",
      filename: item.filename || "24314.pdf"
    };
  }

  if (index === 0) {
    return {
      subject: "Citizen Charter for Rural Water Supply",
      date: "02/05/2026",
      fileNo: "Letter No. 11938/PR&DW",
      filename: item.filename
    };
  }
  if (index === 1) {
    return {
      subject: "Compliance of reform requirements under District Business Reforms Action Plan (DBRAP) 2025-26 – Water Supply Connection service - reg.",
      date: "28/08/2026",
      fileNo: "File No. PR-DWS-MISC-0006-2026 / 24314/PR&DW",
      filename: item.filename
    };
  }

  return {
    subject: item.subject || item.label || item.filename || "Notification",
    date: item.date || "—",
    fileNo: item.fileNo || "",
    filename: item.filename
  };
};

// ── Modal: list view + inline PDF preview ──────────────────────────────────────
export function NotificationModal({ open, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [listLoading, setListLoading]     = useState(false);
  const [listError, setListError]         = useState(false);

  const [activeFile, setActiveFile]       = useState(null);
  const [numPages, setNumPages]           = useState(null);
  const [pdfLoaded, setPdfLoaded]         = useState(false);
  const [pdfError, setPdfError]           = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveFile(null);
    setListLoading(true);
    setListError(false);
    fetchPublicNotifications()
      .then((res) => {
        const rawList = Array.isArray(res.data?.notifications) ? res.data.notifications : [];
        const formatted = rawList.map((item, idx) => ({
          slNo: idx + 1,
          ...getNotificationInfo(item, idx)
        }));
        setNotifications(formatted);
      })
      .catch(() => setListError(true))
      .finally(() => setListLoading(false));
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

  const openFile = (notification) => {
    setActiveFile(notification);
    setNumPages(null);
    setPdfLoaded(false);
    setPdfError(false);
  };

  const backToList = () => setActiveFile(null);

  const viewUrl = useMemo(
    () => (activeFile ? getPublicNotificationViewUrl(activeFile.filename) : ""),
    [activeFile]
  );
  const downloadUrl = useMemo(
    () => (activeFile ? getPublicNotificationDownloadUrl(activeFile.filename) : ""),
    [activeFile]
  );

  if (!open) return null;

  return createPortal(
    <div
      className="user-manual-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Notifications"
    >
      <div 
        className="user-manual-modal" 
        style={{ 
          maxWidth: activeFile ? "900px" : "1050px",
          width: "95vw",
          height: activeFile ? "88vh" : "auto",       /* 👈 Auto-fits content in table mode */
          minHeight: activeFile ? "500px" : "auto",  /* 👈 Removes big empty space */
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column"
        }}
      >
        {/* Header */}
        <div className="user-manual-modal__header" style={{ flexShrink: 0 }}>
          <div className="user-manual-modal__header-left">
            <div className="user-manual-modal__icon">
              <FileText size={18} />
            </div>
            <div className="user-manual-modal__title-group">
              <p className="user-manual-modal__title">
                {activeFile ? activeFile.subject : "DBRAP Portal — Public Notifications"}
              </p>
              <p className="user-manual-modal__subtitle">
                {activeFile 
                  ? `${activeFile.fileNo ? activeFile.fileNo + " | " : ""}Dated: ${activeFile.date}` 
                  : "Official notifications, orders, and citizen charter"}
              </p>
            </div>
          </div>
          <div className="user-manual-modal__header-actions">
            {activeFile && downloadUrl && (
              <a
                href={downloadUrl}
                download={activeFile.filename}
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
        <div 
          className="user-manual-modal__body" 
          style={{ 
            height: activeFile ? "100%" : "auto",
            minHeight: activeFile ? "400px" : "auto",
            padding: activeFile ? "16px" : "18px 20px 24px",
            overflowY: "auto"
          }}
        >
          {!activeFile ? (
            listLoading ? (
              <div className="user-manual-modal__state" style={{ minHeight: "120px" }}>
                <LoaderCircle size={28} className="user-manual-modal__spinner" />
                <span>Loading notifications...</span>
              </div>
            ) : listError ? (
              <div className="user-manual-modal__state user-manual-modal__state--error" style={{ minHeight: "120px" }}>
                <FileText size={36} className="user-manual-modal__error-icon" />
                <p>Unable to load notifications. Please try again later.</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="user-manual-modal__state" style={{ minHeight: "120px" }}>
                <FileText size={36} />
                <span>No notifications available.</span>
              </div>
            ) : (
              <div className="public-dashboard-table-wrap" style={{ margin: 0 }}>
                <table className="public-dashboard-table" style={{ width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "70px", textAlign: "center" }}>Sl. No.</th>
                      <th style={{ minWidth: "400px" }}>Notification Subject</th>
                      <th style={{ width: "160px", textAlign: "center" }}>Notification Date</th>
                      <th style={{ width: "200px", textAlign: "center" }}>Download / Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((n) => (
                      <tr key={n.filename}>
                        <td style={{ textAlign: "center", fontWeight: 600 }}>{n.slNo}</td>
                        <td style={{ textAlign: "left" }}>
                          <div>
                            <button
                              type="button"
                              onClick={() => openFile(n)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#1a3c5a",
                                textAlign: "left",
                                cursor: "pointer",
                                padding: 0,
                                fontSize: "0.95rem",
                                fontWeight: 600,
                                lineHeight: "1.4",
                                textDecoration: "underline",
                              }}
                              title="Click to view PDF"
                            >
                              {n.subject}
                            </button>
                            {n.fileNo && (
                              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "3px" }}>
                                {n.fileNo}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: "center", whiteSpace: "nowrap", fontSize: "0.9rem", color: "#374151" }}>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <Calendar size={14} className="text-gray-500" />
                            {n.date}
                          </span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "8px", alignItems: "center", justifyContent: "center" }}>
                            {/* View Button */}
                            <button
                              type="button"
                              onClick={() => openFile(n)}
                              className="btn btn-secondary !px-3 !py-1 !text-xs"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                cursor: "pointer",
                                border: "1px solid #1a3c5a",
                                borderRadius: "4px",
                                padding: "4px 8px",
                                background: "#fff",
                                color: "#1a3c5a",
                                fontWeight: 500
                              }}
                            >
                              <Eye size={13} /> View
                            </button>

                            {/* Download Button */}
                            <a
                              href={getPublicNotificationDownloadUrl(n.filename)}
                              download={n.filename}
                              className="user-manual-download-btn"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 10px",
                                fontSize: "0.82rem",
                                textDecoration: "none",
                                borderRadius: "4px",
                                background: "#1a3c5a",
                                color: "#ffffff",
                                fontWeight: 500
                              }}
                            >
                              <Download size={13} /> Download
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <>
              <button
                type="button"
                onClick={backToList}
                className="user-manual-download-btn"
                style={{ marginBottom: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <ArrowLeft size={14} /> Back to list
              </button>

              {!pdfLoaded && !pdfError && (
                <div className="user-manual-modal__state">
                  <LoaderCircle size={28} className="user-manual-modal__spinner" />
                  <span>Loading notification preview...</span>
                </div>
              )}
              {pdfError && (
                <div className="user-manual-modal__state user-manual-modal__state--error">
                  <FileText size={40} className="user-manual-modal__error-icon" />
                  <p>Preview unavailable — please download instead.</p>
                  {downloadUrl && (
                    <a href={downloadUrl} download={activeFile.filename} className="user-manual-download-btn">
                      <Download size={14} /> Download PDF
                    </a>
                  )}
                </div>
              )}
              {viewUrl && !pdfError && (
                <div className="user-manual-pdf-viewer">
                  <Document
                    file={viewUrl}
                    onLoadSuccess={(pdf) => {
                      setNumPages(pdf.numPages);
                      setPdfLoaded(true);
                    }}
                    onLoadError={() => {
                      setPdfError(true);
                      setPdfLoaded(true);
                    }}
                    loading={
                      <div className="user-manual-modal__state">
                        <LoaderCircle size={28} className="user-manual-modal__spinner" />
                        <span>Loading notification...</span>
                      </div>
                    }
                    error={
                      <div className="user-manual-modal__state user-manual-modal__state--error">
                        <FileText size={40} className="user-manual-modal__error-icon" />
                        <p>Preview unavailable — please download instead.</p>
                      </div>
                    }
                  >
                    {Array.from({ length: numPages || 0 }, (_, index) => (
                      <Page
                        key={`page_${index + 1}`}
                        pageNumber={index + 1}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        width={850}
                      />
                    ))}
                  </Document>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Nav link — drop-in for landing page ────────────────────────────────────────
function NotificationNavLink({ label = "Notification" }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <a
        href="#notifications"
        onClick={(e) => { e.preventDefault(); setOpen(true); }}
        className="hover:text-accent-blue"
      >
        {label}
      </a>
      <NotificationModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export default NotificationNavLink;