import { useEffect, useMemo, useState } from "react";
import { Download,
  X, } from "lucide-react";
import "./RegistrationPreview.css";
import "../pages/officerDashboardPage.css";
function RegistrationPreview({ sections, onEdit }) {
  const [activeDocument, setActiveDocument] = useState(null);
const [pdfPreview, setPdfPreview] = useState(null);

  const activeDocumentUrl = useMemo(() => {
    if (!activeDocument?.file) return "";
    return URL.createObjectURL(activeDocument.file);
  }, [activeDocument]);

  useEffect(() => {
    return () => {
      if (activeDocumentUrl) {
        URL.revokeObjectURL(activeDocumentUrl);
      }
    };
  }, [activeDocumentUrl]);

  // const openDocument = (item) => {
  //   if (!item?.file) return;
  //   setActiveDocument(item);
  // };

  // const closeDocument = () => setActiveDocument(null);

const openDocument = (item) => {
  if (!item?.file) return;
  if (item.file.type !== "application/pdf") {
    alert("Only PDF files can be previewed.");
    return;
  }

  const url = URL.createObjectURL(item.file);

  setPdfPreview({
    title: item.label,
    fileName: item.file.name,
    url,
    type: item.file.type,
  });
};


const closeDocument = () => {
  if (pdfPreview?.url) {
    URL.revokeObjectURL(pdfPreview.url);
  }
  setPdfPreview(null);
};
  return (
    <div className="registration-preview">
      <div className="registration-preview__header">
        <div>
          <h3 className="registration-preview__title">Preview Application</h3>
          <p className="registration-preview__subtitle">
            Review all details before submitting your registration.
          </p>
        </div>
        <div className="registration-preview__badge">Final Review</div>
      </div>

      <div className="registration-preview__grid">
        {sections.map((section) => (
          <section key={section.title} className="registration-preview__section">
            <h4>{section.title}</h4>
            <div className="registration-preview__items">
              {section.items.map((item) => (
                <div key={item.label} className="registration-preview__item">
                  <span className="registration-preview__label">{item.label}</span>
                  <span className="registration-preview__value">
                    {item.file ? (
                      <button type="button" className="registration-preview__file-button" onClick={() => openDocument(item)}>
                        {item.value || "View file"}
                      </button>
                    ) : (
                      item.value || "-"
                    )}
                  </span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {pdfPreview && (
        <div className="pv-preview-overlay">
          <div className="pv-preview-card">
            <div className="pv-preview-header">
              <h2 className="pv-preview-header__title">{pdfPreview.title}</h2>
              <div className="pv-preview-header__actions">
                <a
  href={pdfPreview.url}
  download={pdfPreview.fileName}
  className="pv-preview-btn-download"
>
  <Download size={14} />
  Download PDF
</a>

                <button
  className="pv-preview-btn-close"
  onClick={closeDocument}
  title="Close Preview"
>
  <X size={18} />
</button>

              </div>
            </div>
            <div className="pv-preview-content">
              <iframe
                src={`${pdfPreview.url}#toolbar=0`}
                className="pv-preview-frame"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}

      <div className="registration-preview__actions">
        <button type="button" className="wizard-btn secondary" onClick={onEdit}>
          Edit
        </button>
        <button type="submit" className="wizard-btn primary">
          Submit
        </button>
      </div>
    </div>
  );
}

export default RegistrationPreview;

