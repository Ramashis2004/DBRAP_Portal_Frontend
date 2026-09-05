import { useState } from "react";
import { Download, FileText, X } from "lucide-react";
import "./PdfPreviewHeader.css";

export async function downloadPdfFile(url, fileName = "document.pdf") {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`PDF download failed with status ${response.status}`);

  const blobUrl = URL.createObjectURL(await response.blob());
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(blobUrl);
}

export default function PdfPreviewHeader({ title, url, fileName, onClose }) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async (event) => {
    event.preventDefault();
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      await downloadPdfFile(url, fileName || `${title || "document"}.pdf`);
    } catch (error) {
     // console.error("PDF download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="pdf-preview-header">
      <div className="pdf-preview-header__left">
        <div className="pdf-preview-header__icon">
          <FileText size={16} />
        </div>
        <div className="pdf-preview-header__title-group">
          <p className="pdf-preview-header__title">{title}</p>
          <p className="pdf-preview-header__subtitle">Click x to close</p>
        </div>
      </div>
      <div className="pdf-preview-header__actions">
        {url && (
          <a
            href={url}
            download={fileName}
            className="pdf-preview-header__download"
            onClick={handleDownload}
            aria-busy={isDownloading}
          >
            <Download size={14} />
            {isDownloading ? "Downloading..." : "Download PDF"}
          </a>
        )}
        <button
          type="button"
          className="pdf-preview-header__close"
          onClick={onClose}
          title="Close Preview"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
