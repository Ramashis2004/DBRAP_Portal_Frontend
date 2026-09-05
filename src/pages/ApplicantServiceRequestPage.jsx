import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import PdfPreviewViewer from "../components/PdfPreviewViewer";
import PdfPreviewHeader from "../components/PdfPreviewHeader";
import Swal from "sweetalert2";
import { Download, X } from "lucide-react";
import {
  fetchApplicantApplication,
  fetchApplicantProfile,
  submitApplicantServiceRequest,
  sendApplicantRegistrationOtp,
  getOrganisationDocumentUrl,
} from "../api/api";
import {
  formatApplicationStatus,
  formatDisplayDate,
} from "../utils/applicationStatus";
import "./ApplicantOrganisationRegistrationPage.css";

const COMMON_DOCUMENTS = [
  ["Property Proof", "property_proof"],
  ["Registration Proof", "registration_proof"],
  ["Ownership Proof", "ownership_proof"],
  ["Owner Indemnity Bond", "owner_indemnity_bond"],
  ["Identity Proof", "identity_proof"],
];

const FLOW_CONFIG = {
  cancellation: {
    title: "Cancellation / Surrender Request",
    successTitle: "Cancellation Request Prepared",
    steps: ["Applicant Details", "Connection Details", "Request Details", "Documents"],
    processSteps: [
      "User logs in by using existing log-in details.",
      "Applicant submits request for cancellation/surrender using the menu as per web format.",
      "Application is routed to Superintending/Executive Engineer, RWSS Division on real time basis.",
      "SE/EE assigns the application to the concerned JE within 24 hours.",
      "JE conducts site visit, consults VWSC, and uploads site inspection report within 7 days.",
      "SE/EE validates and approves the inspection report within 48 hours.",
      "After tariff verification, SE/EE assigns disconnection instruction to JE.",
      "JE coordinates with VWSC and disconnects water connection within 5 days.",
    ],
    escalationRows: [
      ["Disconnection application not assigned to JE", "SE/EE", "Chief Engineer -> EIC"],
      ["JE site visit/report not completed", "JE", "SE/EE -> ACE -> Chief Engineer -> EIC"],
      ["Inspection report not uploaded within 24 hours", "JE", "SE/EE -> ACE -> Chief Engineer -> EIC"],
      ["SE/EE not approving report within 48 hours", "SE/EE", "ACE -> Chief Engineer -> EIC"],
      ["Disconnection not completed", "JE", "SE/EE -> ACE -> Chief Engineer -> EIC"],
    ],
  },
  amendment: {
    title: "Amendment Request",
    successTitle: "Amendment Request Prepared",
    steps: ["Applicant Details", "Existing Details", "Amendment Details", "Documents"],
    processSteps: [
      "User logs in by using existing log-in details.",
      "Applicant submits request for amendment using fields similar to new application.",
      "Applicant submits the same document set as the new connection process.",
      "Application is routed to Superintending/Executive Engineer, RWSS Division on real time basis.",
      "SE/EE assigns the application to the concerned JE within 48 hours.",
      "JE verifies documents and approves in the system within 5 days.",
      "SE/EE validates and approves the amendment request within 5 days.",
    ],
    escalationRows: [
      ["Application not assigned to JE", "SE/EE", "Chief Engineer -> EIC"],
      ["JE not reviewing documents within 5 days", "JE", "SE/EE -> ACE -> Chief Engineer -> EIC"],
      ["SE/EE not approving request within 5 days", "SE/EE", "ACE -> Chief Engineer -> EIC"],
    ],
  },
};

const initialForm = {
  request_reason: "",
  preferred_disconnection_date: "",
  outstanding_tariff_paid: "",
  new_organisation_name: "",
  new_establishment_type: "",
  new_type_of_connection: "",
  new_water_requirement: "",
  amendment_reason: "",
  transfer_user_flag: "false",
  transfer_user_name: "",
  transfer_user_mobile: "",
  transfer_user_email: "",
  transfer_user_gender: "",
  transfer_user_organisation: "",
};

const initialFiles = Object.fromEntries(COMMON_DOCUMENTS.map(([, key]) => [key, null]));

const CONNECTION_DETAILS_STATUSES = new Set([
  "CONNECTION_DETAILS_UPDATED",
  // "UPDTAED_CONNECTION_DETAILS",
]);

const RequiredLabel = ({ children }) => (
  <span>
    {children} <b className="applicant-org-required">*</b>
  </span>
);

const RequestDetailSection = ({ title, children }) => (
  <div className="ce-dashboard-app-section">
    <div className="ce-dashboard-app-section__title">{title}</div>
    <div className="ce-dashboard-app-section__body">{children}</div>
  </div>
);

const RequestDetailRow = ({ label, value }) => (
  <div className="ce-dashboard-app-row">
    <span>{label}</span>
    <strong>{value || "-"}</strong>
  </div>
);

function SubmittedRequestCard({ type, application, requestStatus, onBack }) {
  const isAmendment = type === "amendment";
  const [pdfPreview, setPdfPreview] = useState(null);

  const renderDocumentLink = (documentType, label) => {
    if (!application?.[documentType] || !application?.application_id) return "NA";
    return (
      <button
        type="button"
        onClick={() => setPdfPreview({
          url: getOrganisationDocumentUrl(application.application_id, documentType),
          title: label,
        })}
        style={{
          background: "none",
          border: "none",
          color: "#2563eb",
          textDecoration: "underline",
          cursor: "pointer",
          padding: 0,
          fontSize: "inherit",
          fontWeight: "inherit",
        }}
      >
        View File
      </button>
    );
  };

  return (
    <div className="applicant-org-embedded">
      <div className="applicant-org-card">
        <button type="button" className="applicant-org-back" onClick={onBack}>
          &larr; Back to Dashboard
        </button>
        <h2>{isAmendment ? "Amendment Request" : "Cancellation / Surrender Request"}</h2>

        <div className="aor-existing-banner">
          <div className="aor-existing-banner-icon">!</div>
          <div>
            <div className="aor-existing-banner-title">Request Already Submitted</div>
            <div className="aor-existing-banner-sub">
              This request is already submitted and is being processed.
            </div>
          </div>
        </div>

        <div className="ce-dashboard-app-detail" style={{ padding: "0 24px 8px" }}>
          <div className="ce-dashboard-app-section-grid">
            <RequestDetailSection title="Request Details">
              <RequestDetailRow label="Request ID" value={application.application_id} />
              <RequestDetailRow label="Original Application ID" value={application.connection_application_id} />
              <RequestDetailRow label="Submitted On" value={formatDisplayDate(application.created_at)} />
              <RequestDetailRow label="Status" value={formatApplicationStatus(requestStatus)} />
            </RequestDetailSection>

            <RequestDetailSection title="Applicant Details">
              <RequestDetailRow label="Name" value={application.name} />
              <RequestDetailRow label="Email" value={application.email} />
              <RequestDetailRow label="Mobile Number" value={application.mobile_number} />
            </RequestDetailSection>

            <RequestDetailSection title={isAmendment ? "Amendment Details" : "Cancellation Details"}>
              {isAmendment ? (
                <>
                  <RequestDetailRow label="New Organisation Name" value={application.new_organisation_name} />
                  <RequestDetailRow label="New Establishment Type" value={application.new_establishment_type} />
                  <RequestDetailRow label="New Connection Type" value={application.new_type_of_connection} />
                  <RequestDetailRow label="New Water Required" value={application.new_water_requirement ? `${application.new_water_requirement} L/Day` : null} />
                  <RequestDetailRow label="District" value={application.district} />
                  <RequestDetailRow label="Block" value={application.block} />
                  <RequestDetailRow label="Gram Panchayat" value={application.gram_panchayat} />
                  <RequestDetailRow label="Amendment Reason" value={application.amendment_reason} />
                </>
              ) : (
                <>
                  <RequestDetailRow label="Reason" value={application.request_reason} />
                  <RequestDetailRow label="Preferred Disconnection Date" value={formatDisplayDate(application.preferred_disconnection_date)} />
                  <RequestDetailRow label="Applicable Tariff Paid" value={application.outstanding_tariff_paid} />
                </>
              )}
            </RequestDetailSection>

            {!isAmendment && application.transfer_user_flag && (
              <RequestDetailSection title="New User Details">
                <RequestDetailRow label="Name" value={application.transfer_user_name} />
                <RequestDetailRow label="Mobile Number" value={application.transfer_user_mobile} />
                <RequestDetailRow label="Email" value={application.transfer_user_email} />
                <RequestDetailRow label="Gender" value={application.transfer_user_gender} />
                <RequestDetailRow label="Organisation Details" value={application.transfer_user_organisation} />
              </RequestDetailSection>
            )}

            <RequestDetailSection title={isAmendment ? "Amendment Documents" : "Cancellation Documents"}>
                {[
                  ["Property Proof", "property_proof"],
                  ["Registration Proof", "registration_proof"],
                  ["Ownership Proof", "ownership_proof"],
                  ["Owner Indemnity Bond", "owner_indemnity_bond"],
                  ["Identity Proof", "identity_proof"],
                ].map(([label, documentType]) => (
                  <RequestDetailRow
                    key={documentType}
                    label={label}
                    value={renderDocumentLink(documentType, label)}
                  />
                ))}
            </RequestDetailSection>
          </div>
        </div>
      </div>
      <PdfPreview preview={pdfPreview} setPdfPreview={setPdfPreview} />
    </div>
  );
}

function ApplicantServiceRequestPage({ type }) {
  const navigate = useNavigate();
  const config = FLOW_CONFIG[type] || FLOW_CONFIG.cancellation;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [applicant, setApplicant] = useState(null);
  const [application, setApplication] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [files, setFiles] = useState(initialFiles);
  const [isPreview, setIsPreview] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(null);
  const [transferOtp, setTransferOtp] = useState("");
  const [transferOtpInput, setTransferOtpInput] = useState("");
  const [transferOtpSent, setTransferOtpSent] = useState(false);
  const [transferOtpVerified, setTransferOtpVerified] = useState(false);
  const [transferResendTimer, setTransferResendTimer] = useState(0);
  const [transferMobileError, setTransferMobileError] = useState("");

  useEffect(() => {
    if (transferResendTimer <= 0) return undefined;
    const timer = setInterval(() => {
      setTransferResendTimer((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [transferResendTimer]);

  const applicantSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("applicantSession") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!applicantSession?.id) {
        navigate("/applicant-login", { replace: true });
        return;
      }

      try {
        const [profileResponse, applicationResponse] = await Promise.all([
          fetchApplicantProfile(applicantSession.id),
          fetchApplicantApplication(applicantSession.id).catch(() => null),
        ]);
        setApplicant(profileResponse.data?.applicant || null);
        setApplication(applicationResponse?.data?.application || null);
      } catch (error) {
        await Swal.fire({
          icon: "error",
          title: "Unable to Load",
          text: error.response?.data?.error || "Unable to load applicant details.",
          confirmButtonColor: "#3d1f0f",
        });
        navigate("/applicant-dashboard", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [applicantSession, navigate]);

  const handleBack = () => navigate("/applicant-dashboard");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (name === "transfer_user_mobile") {
      setTransferMobileError(/^[6-9]\d{9}$/.test(value) ? "" : "Enter a valid 10-digit Indian mobile number.");
      setTransferOtpSent(false);
      setTransferOtpVerified(false);
      setTransferOtpInput("");
      setTransferOtp("");
      setTransferResendTimer(0);
    }
  };

  const sendTransferOtp = async () => {
    const mobile = formData.transfer_user_mobile;
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setTransferMobileError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    try {
      await sendApplicantRegistrationOtp(mobile, otp);
      setTransferOtp(otp);
      setTransferOtpSent(true);
      setTransferOtpVerified(false);
      setTransferResendTimer(30);
      await Swal.fire({ icon: "success", title: "OTP Sent", text: `OTP sent to ${mobile}.`, confirmButtonColor: "#3d1f0f" });
    } catch (error) {
      await Swal.fire({ icon: "error", title: "OTP Failed", text: error.response?.data?.error || "Unable to send OTP.", confirmButtonColor: "#3d1f0f" });
    }
  };

  const verifyTransferOtp = async () => {
    if (transferOtpInput !== transferOtp) {
      await Swal.fire({ icon: "error", title: "Invalid OTP", text: "The OTP entered is incorrect.", confirmButtonColor: "#3d1f0f" });
      return;
    }
    setTransferOtpVerified(true);
    await Swal.fire({ icon: "success", title: "Mobile Verified", text: "New user mobile number verified.", confirmButtonColor: "#3d1f0f" });
  };

  const handleFileChange = (event) => {
    const { name, files: fileList } = event.target;
    const file = fileList[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({ icon: "error", title: "File Too Large", text: "File size must be less than 2MB." });
      event.target.value = "";
      return;
    }
    if (file.type !== "application/pdf") {
      Swal.fire({ icon: "error", title: "Invalid File Type", text: "Only PDF files are allowed." });
      event.target.value = "";
      return;
    }
    setFiles((current) => ({ ...current, [name]: file }));
  };

  const validateStep = (index) => {
    if (index === 0) return Boolean(applicant?.name && applicant?.mobile_number);
    if (type === "cancellation") {
      if (index === 1) return Boolean(application?.application_id);
      if (index === 2) {
        const cancellationFieldsValid = Boolean(
          formData.request_reason &&
          formData.preferred_disconnection_date &&
          formData.outstanding_tariff_paid
        );
        if (!cancellationFieldsValid) return false;
        if (formData.transfer_user_flag !== "true") return true;
        return Boolean(
          transferOtpVerified &&
          formData.transfer_user_name && formData.transfer_user_email &&
          formData.transfer_user_gender && formData.transfer_user_organisation &&
          /^[6-9]\d{9}$/.test(formData.transfer_user_mobile)
        );
      }
      if (index === 3) return COMMON_DOCUMENTS.every(([, key]) => Boolean(files[key]));
      return true;
    }
    if (index === 1) return Boolean(application?.application_id);
    if (index === 2) {
      return Boolean(
        formData.new_organisation_name &&
        formData.new_establishment_type &&
        formData.new_type_of_connection &&
        formData.new_water_requirement &&
        formData.amendment_reason
      );
    }
    if (index === 3) return COMMON_DOCUMENTS.every(([, key]) => Boolean(files[key]));
    return true;
  };

  const validateAll = () => config.steps.every((_, index) => validateStep(index));

  const nextStep = async () => {
    if (!validateStep(step)) {
      await Swal.fire({
        icon: "warning",
        title: "Incomplete Fields",
        text: "Please complete all mandatory fields marked with *.",
        confirmButtonColor: "#3d1f0f",
      });
      return;
    }
    setStep((current) => Math.min(current + 1, config.steps.length - 1));
  };

  const openPreview = async () => {
    if (!validateAll()) {
      await Swal.fire({
        icon: "warning",
        title: "Incomplete Fields",
        text: "Please complete all mandatory fields marked with *.",
        confirmButtonColor: "#3d1f0f",
      });
      return;
    }
    setIsPreview(true);
  };

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!validateAll()) {
      await Swal.fire({
        icon: "warning",
        title: "Incomplete Fields",
        text: "Please complete all mandatory fields marked with *.",
        confirmButtonColor: "#3d1f0f",
      });
      return;
    }

    const payload = new FormData();
    payload.append("request_type", type === "cancellation" ? "CANCELLATION" : "AMENDMENT");
    payload.append("applicant_user_id", applicant?.id || applicantSession?.id || "");
    payload.append("original_application_id", connectionApplicationId || "");

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value || "");
    });

    Object.entries(files).forEach(([key, file]) => {
      if (file) payload.append(key, file);
    });

    Swal.fire({
      title: "Submitting...",
      text: "Please wait while we submit your request.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const response = await submitApplicantServiceRequest(payload);
      const requestId = response.data?.data?.application_id;
      // await Swal.fire({
      //   icon: "success",
      //   title: config.successTitle,
      //   html: `Request ID:<br/><b style="font-family:monospace;font-size:1.2rem;">${requestId}</b><br/>Request forwarded to SE/EE for further processing.`,
      //   confirmButtonColor: "#3d1f0f",
      // });

      await Swal.fire({
  icon: "success",
  title: config.successTitle,
  text: `Request ID: ${requestId}\n\nRequest forwarded to SE/EE for further processing.`,
  confirmButtonColor: "#3d1f0f",
});
      handleBack();
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: "Submission Failed",
        text: error.response?.data?.error || "Something went wrong.",
        confirmButtonColor: "#3d1f0f",
      });
    } finally {
      Swal.close();
    }
  };

  const previewSections = getPreviewSections(type, applicant, application, formData, files);
  const existingOrganisationName =
    application?.connection_organisation_name || application?.organisation_name;
  const existingEstablishmentType =
    application?.connection_establishment_type || application?.establishment_type;
  const existingConnectionType =
    application?.connection_type_of_connection || application?.type_of_connection;
  const existingWaterRequirement =
    application?.connection_water_requirement || application?.water_requirement;

  if (loading) {
    return (
      <div className="applicant-org-embedded">
        <div className="applicant-org-card applicant-service-state">Loading...</div>
      </div>
    );
  }

  const connectionApplicationId = application?.connection_application_id || application?.application_id;
  const connectionApplicationStatus =
    application?.connection_application_status || application?.application_status;
  const requestStatus =
    type === "cancellation" && !(application?.transfer_user_flag && String(application?.transfer_user_id) === String(applicantSession?.id))
      ? application?.cancellation_request_status
      : type === "amendment" ? application?.amendment_request_status : null;
  const submittedApplication =
    type === "cancellation"
      ? {
          ...application,
          application_id: application?.cancellation_request_application_id,
          created_at: application?.cancellation_request_created_at,
          request_reason: application?.cancellation_request_reason,
          preferred_disconnection_date: application?.cancellation_preferred_disconnection_date,
          outstanding_tariff_paid: application?.cancellation_outstanding_tariff_paid,
          property_proof: application?.cancellation_property_proof,
          registration_proof: application?.cancellation_registration_proof,
          ownership_proof: application?.cancellation_ownership_proof,
          owner_indemnity_bond: application?.cancellation_owner_indemnity_bond,
          identity_proof: application?.cancellation_identity_proof,
        }
      : {
          ...application,
          application_id: application?.amendment_request_application_id,
          created_at: application?.amendment_request_created_at,
          new_organisation_name: application?.amendment_new_organisation_name,
          new_establishment_type: application?.amendment_new_establishment_type,
          new_type_of_connection: application?.amendment_new_type_of_connection,
          new_water_requirement: application?.amendment_new_water_requirement,
          amendment_reason: application?.amendment_reason,
          property_proof: application?.amendment_property_proof,
          registration_proof: application?.amendment_registration_proof,
          ownership_proof: application?.amendment_ownership_proof,
          owner_indemnity_bond: application?.amendment_owner_indemnity_bond,
          identity_proof: application?.amendment_identity_proof,
        };

  if (requestStatus) {
    return (
      <SubmittedRequestCard
        type={type}
        application={submittedApplication}
        requestStatus={requestStatus}
        onBack={handleBack}
      />
    );
  }

  if (
    !connectionApplicationId ||
    !CONNECTION_DETAILS_STATUSES.has(String(connectionApplicationStatus || "").toUpperCase()) ||
    !application?.consumer_id
  ) {
    return (
      <div className="applicant-org-embedded">
        <div className="applicant-org-card applicant-service-empty">
          <button type="button" className="applicant-org-back" onClick={handleBack}>
            &larr; Back to Dashboard
          </button>
          <h2>{config.title}</h2>
          <div className="aor-existing-banner applicant-service-warning">
            <div className="aor-existing-banner-icon">!</div>
            <div>
              <div className="aor-existing-banner-title">
                {type === "amendment"
                  ? "Connection Not Available For Amendment"
                  : "Connection Not Available For Cancellation/Transfer"}
              </div>
              <div className="aor-existing-banner-sub">
                A connection with updated details and a consumer ID is required for this request.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (application.application_status === "CONNECTION_DISCONNECTED") {
    return (
      <div className="applicant-org-embedded">
        <div className="applicant-org-card applicant-service-empty">
          <button type="button" className="applicant-org-back" onClick={handleBack}>
            &larr; Back to Dashboard
          </button>
          <h2>{config.title}</h2>
          <div className="aor-existing-banner applicant-service-warning">
            <div className="aor-existing-banner-icon">!</div>
            <div>
              <div className="aor-existing-banner-title">Request Not Available</div>
              <div className="aor-existing-banner-sub">
                Your water connection has already been disconnected. Please apply for a new connection instead.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="applicant-org-embedded">
      <form className="applicant-org-card" onSubmit={submitRequest}>
        <button type="button" className="applicant-org-back" onClick={handleBack}>
          &larr; Back to Dashboard
        </button>

        <h2>{config.title}</h2>

        {!isPreview ? (
          <>
            <div className="applicant-org-steps">
              {config.steps.map((label, index) => (
                <button
                  key={label}
                  type="button"
                  className={index === step ? "active" : ""}
                  onClick={() => index <= step && setStep(index)}
                >
                  <span>{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>

            {step === 0 && (
              <div className="applicant-org-panel">
                <Field label="Name" required><input value={applicant?.name || ""} disabled /></Field>
                <Field label="Gender"><input value={applicant?.gender || ""} disabled /></Field>
                <Field label="Email"><input value={applicant?.email || ""} disabled /></Field>
                <Field label="Mobile Number" required><input value={applicant?.mobile_number || ""} disabled /></Field>
              </div>
            )}

            {step === 1 && (
              <div className="applicant-org-panel">
                <Field label="Application ID" required><input value={connectionApplicationId || ""} disabled /></Field>
                <Field label="Application Status"><input value={formatApplicationStatus(connectionApplicationStatus)} disabled /></Field>
                <Field label="Organisation Name"><input value={existingOrganisationName || ""} disabled /></Field>
                <Field label="Establishment Type"><input value={existingEstablishmentType || ""} disabled /></Field>
                <Field label="Connection Type"><input value={existingConnectionType || ""} disabled /></Field>
                <Field label="Water Requirement (Litre/Day)"><input value={existingWaterRequirement || ""} disabled /></Field>
                <Field label="Application Received"><input value={formatDisplayDate(application.created_at)} disabled /></Field>
              </div>
            )}

            {type === "cancellation" && step === 2 && (
              <div className="applicant-org-panel">
                <Field label="Reason for Cancellation / Surrender" required>
                  <textarea name="request_reason" value={formData.request_reason} onChange={handleChange} />
                </Field>
                <Field label="Preferred Disconnection Date" required>
                  <input type="date" name="preferred_disconnection_date" value={formData.preferred_disconnection_date} onChange={handleChange} />
                </Field>
                <Field label="Applicable Tariff Paid" required>
                  <select name="outstanding_tariff_paid" value={formData.outstanding_tariff_paid} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </Field>
                <div className="applicant-org-field applicant-service-transfer-choice">
                  <span>Transfer to Another User <b className="applicant-org-required">*</b></span>
                  <div className="applicant-service-choice" role="radiogroup" aria-label="Transfer to Another User">
                    <label className={formData.transfer_user_flag === "false" ? "selected" : ""}>
                      <input type="radio" name="transfer_user_flag" value="false" checked={formData.transfer_user_flag === "false"} onChange={handleChange} />
                      No
                    </label>
                    <label className={formData.transfer_user_flag === "true" ? "selected" : ""}>
                      <input type="radio" name="transfer_user_flag" value="true" checked={formData.transfer_user_flag === "true"} onChange={handleChange} />
                      Yes
                    </label>
                  </div>
                </div>
                {formData.transfer_user_flag === "true" && (
                  <div className="applicant-service-transfer-fields">
                    <Field label="Mobile Number of New User" required>
                      <div className="applicant-service-otp-row">
                        <input name="transfer_user_mobile" value={formData.transfer_user_mobile} onChange={handleChange} inputMode="numeric" maxLength={10} disabled={transferOtpVerified} />
                        <button type="button" onClick={sendTransferOtp} disabled={Boolean(transferMobileError) || formData.transfer_user_mobile.length !== 10 || transferOtpVerified || transferResendTimer > 0}>
                          {transferOtpSent ? (transferResendTimer > 0 ? `Resend OTP (${transferResendTimer}s)` : "Resend OTP") : "Send OTP"}
                        </button>
                      </div>
                      {transferMobileError && <small className="applicant-service-error">{transferMobileError}</small>}
                    </Field>
                    {transferOtpSent && !transferOtpVerified && (
                      <>
                        <Field label="Enter OTP" required><input value={transferOtpInput} onChange={(event) => setTransferOtpInput(event.target.value.replace(/\D/g, "").slice(0, 6))} maxLength={6} inputMode="numeric" /></Field>
                        <button type="button" onClick={verifyTransferOtp} disabled={transferOtpInput.length !== 6}>Verify OTP</button>
                      </>
                    )}
                    {transferOtpVerified && <>
                      <Field label="Name of New User" required><input name="transfer_user_name" value={formData.transfer_user_name} onChange={handleChange} /></Field>
                      <Field label="Email ID of New User" required><input type="email" name="transfer_user_email" value={formData.transfer_user_email} onChange={handleChange} /></Field>
                      <Field label="Gender" required><select name="transfer_user_gender" value={formData.transfer_user_gender} onChange={handleChange}><option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></select></Field>
                      <Field label="Organisation Details" required><input name="transfer_user_organisation" value={formData.transfer_user_organisation} onChange={handleChange} /></Field>
                    </>}
                  </div>
                )}
              </div>
            )}

            {type === "amendment" && step === 2 && (
              <div className="applicant-org-panel">
                <Field label="New Organisation Name" required>
                  <input name="new_organisation_name" value={formData.new_organisation_name} onChange={handleChange} />
                </Field>
                <Field label="New Establishment / Business Type" required>
                  <input name="new_establishment_type" value={formData.new_establishment_type} onChange={handleChange} />
                </Field>
                <Field label="New Connection Type" required>
                  <select name="new_type_of_connection" value={formData.new_type_of_connection} onChange={handleChange}>
                    <option value="">Select Connection Type</option>
                    <option value="Single Tap">Single Tap</option>
                    <option value="More than one tap">More than one tap</option>
                  </select>
                </Field>
                <Field label="New Water Requirement (Litre/Day)" required>
                  <input name="new_water_requirement" value={formData.new_water_requirement} onChange={handleChange} />
                </Field>
                <Field label="Reason for Amendment" required>
                  <textarea name="amendment_reason" value={formData.amendment_reason} onChange={handleChange} />
                </Field>
              </div>
            )}

            {((type === "amendment" && step === 3) || (type === "cancellation" && step === 3)) && (
              <div className="applicant-org-panel">
                {COMMON_DOCUMENTS.map(([label, key]) => (
                  <FileField
                    key={key}
                    name={key}
                    label={label}
                    onChange={handleFileChange}
                    selectedFile={files[key]}
                  />
                ))}
              </div>
            )}

            <div className="applicant-org-actions">
              <button type="button" className="secondary" onClick={() => setStep((current) => Math.max(current - 1, 0))} disabled={step === 0}>
                Back
              </button>
              {step < config.steps.length - 1 ? (
                <button type="button" onClick={nextStep}>Next</button>
              ) : (
                <button type="button" onClick={openPreview}>Preview</button>
              )}
            </div>
          </>
        ) : (
          <div className="applicant-org-preview">
            <h3>Preview Request</h3>
            <ReviewPanel previewSections={previewSections} files={files} setPdfPreview={setPdfPreview} />
            <div className="applicant-org-actions">
              <button type="button" className="secondary" onClick={() => setIsPreview(false)}>Edit</button>
              <button type="submit">Submit</button>
            </div>
          </div>
        )}

        <PdfPreview preview={pdfPreview} setPdfPreview={setPdfPreview} />
      </form>
    </div>
  );
}

function getPreviewSections(type, applicant, application, formData, files) {
  const connectionDetails = type === "cancellation"
    ? {
        applicationId: application?.connection_application_id || application?.application_id,
        organisationName: application?.connection_organisation_name || application?.organisation_name,
        status: application?.connection_application_status || application?.application_status,
        connectionType: application?.connection_type_of_connection || application?.type_of_connection,
        waterRequirement: application?.connection_water_requirement || application?.water_requirement,
      }
    : {
        applicationId: application?.application_id,
        organisationName: application?.organisation_name,
        status: application?.application_status,
        connectionType: application?.type_of_connection,
        waterRequirement: application?.water_requirement,
      };

  const sections = [
    ["Applicant Details", [
      ["Name", applicant?.name],
      ["Gender", applicant?.gender],
      ["Email", applicant?.email],
      ["Mobile Number", applicant?.mobile_number],
    ]],
    ["Connection Details", [
      ["Application ID", connectionDetails.applicationId],
      ["Organisation Name", connectionDetails.organisationName],
      ["Status", formatApplicationStatus(connectionDetails.status)],
      ["Connection Type", connectionDetails.connectionType],
      ["Water Requirement", connectionDetails.waterRequirement],
    ]],
  ];

  if (type === "cancellation") {
    sections.push(
      ["Request Details", [
        ["Reason", formData.request_reason],
        ["Preferred Disconnection Date", formData.preferred_disconnection_date],
        ["Applicable Tariff Paid", formData.outstanding_tariff_paid],
      ]],
      ...(formData.transfer_user_flag === "true" ? [["New User Details", [
        ["Name", formData.transfer_user_name],
        ["Mobile Number", formData.transfer_user_mobile],
        ["Email", formData.transfer_user_email],
        ["Gender", formData.transfer_user_gender],
        ["Organisation Details", formData.transfer_user_organisation],
      ]]] : []),
      ["Documents", Object.entries(files).map(([key, file]) => [key, file?.name || "-"])]
    );
    return sections;
  }

  sections.push(
    ["Amendment Details", [
      ["New Organisation Name", formData.new_organisation_name],
      ["New Establishment Type", formData.new_establishment_type],
      ["New Connection Type", formData.new_type_of_connection],
      ["New Water Requirement", formData.new_water_requirement],
      ["Reason", formData.amendment_reason],
    ]],
    ["Documents", Object.entries(files).map(([key, file]) => [key, file?.name || "-"])]
  );
  return sections;
}

function ReviewPanel({ previewSections, files, setPdfPreview }) {
  return (
    <div className="applicant-org-preview-grid applicant-service-review-grid">
      {previewSections.map(([title, items]) => (
        <section key={title}>
          <h4>{title}</h4>
          {items.map(([label, value]) => {
            const displayLabel =
              title === "Documents"
                ? label.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase())
                : label;
            return (
              <div key={label}>
                <span>{displayLabel}</span>
                {title === "Documents" && files[label] ? (
                  <button
                    type="button"
                    className="applicant-service-file-view"
                    onClick={() => {
                      const url = URL.createObjectURL(files[label]);
                      setPdfPreview({
                        url,
                        title: displayLabel,
                        fileName: files[label].name,
                      });
                    }}
                  >
                    View File
                  </button>
                ) : (
                  <strong>{value || "-"}</strong>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="applicant-org-field">
      {required ? <RequiredLabel>{label}</RequiredLabel> : <span>{label}</span>}
      {children}
    </label>
  );
}

function FileField({ name, label, onChange, selectedFile }) {
  const inputRef = useRef(null);

  return (
    <div className="applicant-org-field">
      <span>
        {label} <b className="applicant-org-required">*</b>
      </span>
      <div className="applicant-service-file-picker">
        <button type="button" onClick={() => inputRef.current?.click()}>
          Choose file
        </button>
        <span>{selectedFile ? selectedFile.name : "No file chosen"}</span>
        <input ref={inputRef} type="file" name={name} accept=".pdf" onChange={onChange} />
      </div>
      <small>Max size: 2MB. Only PDF files are allowed.</small>
    </div>
  );
}

function PdfPreview({ preview, setPdfPreview }) {
  if (!preview) return null;

  return (
    <div className="pv-preview-overlay">
      <div className="pv-preview-card">
        <PdfPreviewHeader
          title={preview.title}
          url={preview.url}
          fileName={preview.fileName}
          onClose={() => {
            if (preview.url) URL.revokeObjectURL(preview.url);
            setPdfPreview(null);
          }}
        />
        <div className="pv-preview-content">
          {preview.url ? (
            <PdfPreviewViewer url={preview.url} title={preview.title} />
          ) : (
            <div className="applicant-service-state">Preview unavailable.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ApplicantServiceRequestPage;
