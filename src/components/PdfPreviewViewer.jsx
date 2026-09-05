import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "./PdfPreviewViewer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function PdfPreviewViewer({ url, title = "PDF Preview", onLoad, onError }) {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(false);
  const [previewSource, setPreviewSource] = useState(null);
  const bodyRef = useRef(null);
  const firstPageRef = useRef(null);

  const resetScroll = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        firstPageRef.current?.scrollIntoView({ block: "start", inline: "nearest" });
        bodyRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
    });
  };

  useEffect(() => {
    if (!url) return undefined;

    let objectUrl = "";
    let cancelled = false;

    fetch(url, { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`Preview request failed with status ${response.status}`);
        return response.blob();
      })
      .then(async (blob) => {
        if (cancelled) return;
        setError(false);
        const contentType = blob.type.toLowerCase();
        const signature = new TextDecoder().decode(new Uint8Array(await blob.slice(0, 4).arrayBuffer()));
        const isPdf = contentType === "application/pdf" || signature === "%PDF";
        objectUrl = URL.createObjectURL(blob);
        setPreviewSource({
          kind: contentType.startsWith("image/") ? "image" : isPdf ? "pdf" : "unsupported",
          url: objectUrl,
          sourceUrl: url,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          onError?.();
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, onError]);

  useEffect(() => {
    if (numPages) resetScroll();
  }, [numPages]);

  return (
    <div ref={bodyRef} className="pdf-preview-viewer" aria-label={title}>
      {error ? (
        <div className="pdf-preview-viewer__state">Preview unavailable.</div>
      ) : previewSource?.sourceUrl === url && previewSource.kind === "image" ? (
        <div className="pdf-preview-viewer__image-state">
          <img src={previewSource.url} alt={title} className="pdf-preview-viewer__image" onLoad={resetScroll} />
        </div>
      ) : previewSource?.sourceUrl === url && previewSource.kind === "unsupported" ? (
        <div className="pdf-preview-viewer__state">This file type cannot be previewed. Use Download instead.</div>
      ) : previewSource?.sourceUrl !== url ? (
        <div className="pdf-preview-viewer__state">Loading preview...</div>
      ) : (
        <Document
          key={url}
          file={previewSource?.url}
          onLoadSuccess={({ numPages: loadedPages }) => {
            setNumPages(loadedPages);
            onLoad?.();
          }}
          onLoadError={() => {
            setError(true);
            onError?.();
          }}
          loading={<div className="pdf-preview-viewer__state">Loading preview...</div>}
          error={<div className="pdf-preview-viewer__state">Preview unavailable.</div>}
        >
          {Array.from({ length: numPages || 0 }, (_, index) => (
            <div
              key={`page_wrapper_${index + 1}`}
              ref={index === 0 ? firstPageRef : undefined}
              className="pdf-preview-viewer__page"
            >
              <Page
                pageNumber={index + 1}
                width={850}
                onRenderSuccess={index === 0 ? resetScroll : undefined}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      )}
    </div>
  );
}
