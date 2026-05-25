// pages/ApplicantPaymentPage.jsx
// Rendered inside ApplicantLayout — no sidebar needed here

import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { Download, ExternalLink, ReceiptText, Upload, X } from "lucide-react";
import axios from "axios";
import "./ApplicantPaymentPage.css";

const API_BASE = "http://localhost:5000/api";

const fetchPaymentDetails = (userId) =>
  axios.get(`${API_BASE}/applicant-payment/details`, { params: { userId } });

const uploadPaymentReceipt = (formData) =>
  axios.post(`${API_BASE}/applicant-payment/upload`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

const getReceiptUrl = (applicationId) =>
  `${API_BASE}/applicant-payment/receipt/${applicationId}`;

// ── Status badge ──────────────────────────────────────────────────────────────
const statusBadge = (status) => {
  const s = String(status || "").toUpperCase();
  let cls = "appl-status-badge--default";
  if (s === "PAYMENT_RECEIPT_UPLOADED") cls = "appl-status-badge--uploaded";
  else if (s === "PAYMENT_RECEIPT_VERIFIED") cls = "appl-status-badge--verified";
  else if (s.includes("PENDING") || s.includes("SUBMITTED")) cls = "appl-status-badge--pending";
  return <span className={`appl-status-badge ${cls}`}>{s.replace(/_/g, " ")}</span>;
};

function ApplicantPaymentPage() {
  const navigate = useNavigate();

  const applicantSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("applicantSession") || "null");
    } catch {
      return null;
    }
  }, []);

  const [appData, setAppData]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount]               = useState("");
  const [dateOfPayment, setDateOfPayment] = useState("");
  const [receiptFile, setReceiptFile]     = useState(null);
  const [message, setMessage]             = useState({ text: "", type: "" });

  // ── PDF preview state (mirrors PaymentVerificationPage) ───────────────────
  const [pdfPreview, setPdfPreview] = useState(null);

  const fileRef = useRef(null);

  useEffect(() => {
    if (!applicantSession?.id) {
      navigate("/applicant-login", { replace: true });
    }
  }, [applicantSession, navigate]);

  useEffect(() => {
    if (!applicantSession?.id) return;

    const load = async () => {
      try {
        const res = await fetchPaymentDetails(applicantSession.id);
        const data = res.data?.data || null;
        console.log("Payment details response:", res.data);
        setAppData(data);

        if (data?.amount) setAmount(String(data.amount));
        if (data?.date_of_payment) {
          const d = new Date(data.date_of_payment);
          if (!isNaN(d)) setDateOfPayment(d.toISOString().slice(0, 10));
        }
      } catch (err) {
        console.error("Load error:", err);
        setAppData(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [applicantSession]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (!amount || Number(amount) <= 0) {
      setMessage({ text: "Please enter a valid amount.", type: "error" });
      return;
    }
    if (!dateOfPayment) {
      setMessage({ text: "Please select date of payment.", type: "error" });
      return;
    }
    if (!receiptFile) {
      setMessage({ text: "Please upload the money receipt.", type: "error" });
      return;
    }
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(receiptFile.type)) {
      setMessage({ text: "Only PDF, JPG, and PNG files are allowed.", type: "error" });
      return;
    }
    if (receiptFile.size > 2 * 1024 * 1024) {
      setMessage({ text: "File size must be 2 MB or less.", type: "error" });
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("userId",        applicantSession.id);
      fd.append("applicationId", appData.application_id);
      fd.append("amount",        amount);
      fd.append("dateOfPayment", dateOfPayment);
      fd.append("money_receipt", receiptFile);

      await uploadPaymentReceipt(fd);
      await Swal.fire("Success", "Payment receipt uploaded successfully. Application forwarded to " + appData.block + " JE for verification.", "success");

      const refreshed = await fetchPaymentDetails(applicantSession.id);
      setAppData(refreshed.data?.data || appData);
      setReceiptFile(null);
      if (fileRef.current) fileRef.current.value = "";
      setMessage({ text: "Uploaded successfully.", type: "success" });
    } catch (err) {
      setMessage({
        text: err?.response?.data?.error || "Failed to upload. Please try again.",
        type: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyUploaded =
    ["PAYMENT_RECEIPT_UPLOADED", "PAYMENT_RECEIPT_VERIFIED"].includes(
      String(appData?.application_status || "").toUpperCase()
    ) || !!appData?.money_receipt;

  const canUploadReceipt =
    String(appData?.application_status || "").toUpperCase() ===
    "APPLICATION_APPROVED";

  if (loading) {
    return <div style={{ padding: "40px", color: "#64748b" }}>Loading payment details…</div>;
  }

  return (
    <div>
      {!appData && (
        <div className="appl-payment-card">
          <p style={{ color: "#64748b", textAlign: "center", padding: "24px 0" }}>
            No application found for your account. Please submit an application first.
          </p>
        </div>
      )}

      {appData && (
        <>
          {/* Application summary */}
          <div className="appl-payment-card">
            <div className="appl-payment-card__header">
              <ReceiptText size={22} />
              <div>
                <h2>Application Summary</h2>
                <p>Your current application and payment status</p>
              </div>
            </div>

            <div className="appl-info-grid">
              <InfoItem label="Application ID"  value={appData.application_id} />
              <InfoItem label="Organisation"    value={appData.organisation_name} />
              <InfoItem label="Connection Type" value={appData.type_of_connection} />
              <InfoItem label="Block"           value={appData.block} />
              <InfoItem label="District"        value={appData.district} />
              <InfoItem label="Applicant Name"  value={appData.name} />
              <InfoItem label="Mobile"          value={appData.mobile_number} />
              <InfoItem
                label="Application Status"
                value={statusBadge(appData.application_status)}
              />
              {appData.amount && (
                <InfoItem
                  label="Amount Paid"
                  value={`₹ ${Number(appData.amount).toLocaleString("en-IN")}`}
                />
              )}
              {appData.date_of_payment && (
                <InfoItem
                  label="Date of Payment"
                  value={new Date(appData.date_of_payment).toLocaleDateString("en-IN")}
                />
              )}
              {/* ── Money Receipt — opens PDF preview overlay ── */}
              {appData.money_receipt && (
                <InfoItem
                  label="Money Receipt"
                  value={
                    <button
                      onClick={() =>
                        setPdfPreview({
                          url: getReceiptUrl(appData.application_id),
                          title: `Money Receipt — ${appData.application_id}`,
                        })
                      }
                      style={{
                        background: "none",
                        border: "none",
                        color: "#2563eb",
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: 0,
                        fontSize: "inherit",
                        fontWeight: "inherit",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <ExternalLink size={14} /> View Receipt
                    </button>
                  }
                />
              )}
            </div>
          </div>

          {/* Upload form */}
          {canUploadReceipt || alreadyUploaded ? (
            <div className="appl-payment-card">
              <div className="appl-payment-card__header">
                <Upload size={22} />
                <div>
                  <h2>Upload Money Receipt</h2>
                  <p>
                    {alreadyUploaded
                      ? "Receipt already submitted."
                      : "Upload your payment receipt to proceed."}
                  </p>
                </div>
              </div>

              {alreadyUploaded ? (
                <div className="appl-uploaded-notice">
                  ✅ Payment receipt already uploaded. You can view it above.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="appl-payment-form">
                  <div className="appl-form-field">
                    <label>Application ID</label>
                    <input type="text" value={appData.application_id} readOnly />
                  </div>

                  <div className="appl-form-field">
                    <label>Connection Type</label>
                    <input type="text" value={appData.type_of_connection || ""} readOnly />
                  </div>

                  <div className="appl-form-field">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      placeholder="Enter amount paid"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="appl-form-field">
                    <label>Date of Payment</label>
                    <input
                      type="date"
                      value={dateOfPayment}
                      onChange={(e) => setDateOfPayment(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      required
                    />
                  </div>

                  <div className="appl-form-field appl-payment-form__full">
                    <label>Money Receipt (PDF / JPG / PNG — max 2 MB)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      ref={fileRef}
                      onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                      required
                    />
                  </div>

                  {message.text && (
                    <div
                      className={`appl-payment-message appl-payment-form__full appl-payment-message--${message.type}`}
                    >
                      {message.text}
                    </div>
                  )}

                  <div className="appl-payment-form__full">
                    <button
                      type="submit"
                      className="appl-payment-submit"
                      disabled={submitting}
                    >
                      <Upload size={16} />
                      {submitting ? "Uploading…" : "Submit Payment Receipt"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="appl-payment-card">
              <div className="appl-uploaded-notice">
                Payment receipt upload is available only after application approval.
              </div>
            </div>
          )}
        </>
      )}

      {/* ── PDF Preview Overlay (mirrors PaymentVerificationPage) ──────────── */}
      {pdfPreview && (
        <div className="pv-preview-overlay">
          <div className="pv-preview-card">
            <div className="pv-preview-header">
              <h2 className="pv-preview-header__title">{pdfPreview.title}</h2>
              <div className="pv-preview-header__actions">
                <a
                  href={pdfPreview.url}
                  download
                  className="pv-preview-btn-download"
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download size={14} />
                  Download PDF
                </a>
                <button
                  className="pv-preview-btn-close"
                  onClick={() => setPdfPreview(null)}
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
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="appl-info-item">
      <div className="appl-info-item__label">{label}</div>
      <div className="appl-info-item__value">{value || "—"}</div>
    </div>
  );
}

export default ApplicantPaymentPage;
