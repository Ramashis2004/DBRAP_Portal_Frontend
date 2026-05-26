import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5000/api"
});

export const fetchPublicDashboardSummary = () => {
  return API.get("/public-dashboard/summary");
};

export const registerOrganisation = (data) => {
  return API.post("/organisation/register", data);
};

export const registerApplicant = (data) => {
  return API.post("/auth/applicant/register", data);
};

export const checkApplicantLoginMobile = (mobileNumber) => {
  return API.get("/applicant-auth/check-mobile", {
    params: { mobile_number: mobileNumber }
  });
};

export const loginApplicant = (payload) => {
  return API.post("/applicant-auth/login", payload);
};

export const loginApplicantWithPassword = (payload) => {
  return API.post("/applicant-auth/login-password", payload);
};

export const fetchApplicantNavigation = (roleId = 7) => {
  return API.get(`/applicant-application/navigation/${roleId}`);
};

export const fetchApplicantProfile = (userId) => {
  return API.get(`/applicant-application/profile/${userId}`);
};

export const registerApplicantOrganisation = (data) => {
  return API.post("/applicant-application/register-organisation", data);
};

export const checkApplicantMobile = (mobileNumber) => {
  return API.get("/auth/applicant/check-mobile", {
    params: { mobile_number: mobileNumber }
  });
};

export const loginOfficer = (credentials) => {
  return API.post("/auth/login", credentials);
};

export const logoutOfficer = (payload) => {
  return API.post("/auth/logout", payload);
};

export const fetchOfficerDashboardConfig = (userId) => {
  return API.get(`/auth/dashboard-config/${userId}`);
};

export const createOfficerUser = (payload) => {
  return API.post("/auth/users", payload);
};

export const getOfficerUsers = () => {
  return API.get("/auth/users");
};

export const fetchCircles = () => {
  return API.get("/location/circles");
};

export const fetchDistrictsByCircle = (circle_code) => {
  return API.get(`/location/districts-by-circle/${circle_code}`);
};

export const fetchDivisionsByCircle = (circle_code) => {
  return API.get(`/location/divisions/${circle_code}`);
};

export const fetchDivisionsByDistrict = (district_code) => {
  return API.get(`/location/divisions-by-district/${district_code}`);
};

export const fetchBlocksByDivision = (division_code) => {
  return API.get(`/location/division-blocks/${division_code}`);
};

export const fetchDistricts = () => {
  return API.get("/location/districts");
};

export const fetchBlocks = (district_code) => {
  return API.get(`/location/blocks/${district_code}`);
};

export const fetchPanchayats = (block_code) => {
  return API.get(`/location/panchayats/${block_code}`);
};

export const sendOtp = (data) => {
  return API.post("/officer/forgot-password/send-otp", data);
};

export const verifyOtp = (data) => {
  return API.post("/officer/forgot-password/verify-otp", data);
};

export const resetPassword = (data) => {
  return API.post("/officer/forgot-password/reset", data);
};

export const fetchOrganisations = (application_status, userId) => {
  return API.get("/organisation/organisations", {
    params: { application_status, userId }
  });
};

// ── SE / JE application received ─────────────────────────────────────────────
export const fetchApplicationReceivedApplications = (userId, application_status) => {
  return API.get("/application-received/applications", {
    params: { userId, application_status },
  });
};

// ── SE ────────────────────────────────────────────────────────────────────────
export const fetchSEDashboardApplicationSummary = (userId) => {
  return API.get("/se-dashboard-applications/summary", {
    params: { userId },
  });
};

export const fetchSEDashboardApplications = (userId, application_status) => {
  return API.get("/se-dashboard-applications/applications", {
    params: { userId, application_status },
  });
};

// ── AEE ───────────────────────────────────────────────────────────────────────
export const fetchAEEDashboardApplicationSummary = (userId) => {
  return API.get("/aee-dashboard-applications/summary", {
    params: { userId },
  });
};

export const fetchAEEDashboardApplications = (userId, application_status) => {
  return API.get("/aee-dashboard-applications/applications", {
    params: { userId, application_status },
  });
};

// ── CE ────────────────────────────────────────────────────────────────────────
export const fetchCEDashboardApplicationSummary = (userId) =>
  API.get("/ce-dashboard-applications/summary", { params: { userId } });

export const fetchCEDashboardCircles = (userId) =>
  API.get("/ce-dashboard-applications/circles", { params: { userId } });

export const fetchCEDashboardDivisions = (userId, circleCode) =>
  API.get("/ce-dashboard-applications/divisions", { params: { userId, circleCode } });

export const fetchCEDashboardBlocks = (userId, divisionCode) =>
  API.get("/ce-dashboard-applications/blocks", { params: { userId, divisionCode } });

export const fetchCEDashboardPanchayats = (userId, blockCode, application_status = "") =>
  API.get("/ce-dashboard-applications/panchayats", {
    params: { userId, blockCode, application_status },
  });

export const fetchCEDashboardApplications = (
  userId,
  blockCode,
  application_status = "",
  gramPanchayatCode = ""
) =>
  API.get("/ce-dashboard-applications/applications", {
    params: { userId, blockCode, application_status, gramPanchayatCode },
  });

// ── CE Overdue ────────────────────────────────────────────────────────────────
export const fetchCEOverdueSummary = (userId) =>
  API.get("/ce-dashboard/overdue-summary", { params: { userId } });

export const fetchCEOverdueByDivision = (userId, bucket) =>
  API.get("/ce-dashboard/overdue-by-division", { params: { userId, bucket } });

export const fetchCEOverdueApplicationsByDivision = (userId, divisionCode, bucket) =>
  API.get("/ce-dashboard/overdue-applications-by-division", {
    params: { userId, divisionCode, bucket },
  });

export const fetchCEOverdueApplicationHistory = (userId, applicationId) =>
  API.get("/ce-dashboard/overdue-application-history", {
    params: { userId, applicationId },
  });

// ── EIC ───────────────────────────────────────────────────────────────────────
export const fetchEICDashboardApplicationSummary = (userId) =>
  API.get("/eic-dashboard-applications/summary", { params: { userId } });

export const fetchEICDashboardCircles = (userId) =>
  API.get("/eic-dashboard-applications/circles", { params: { userId } });

export const fetchEICDashboardDivisions = (userId, circleCode) =>
  API.get("/eic-dashboard-applications/divisions", { params: { userId, circleCode } });

export const fetchEICDashboardBlocks = (userId, divisionCode) =>
  API.get("/eic-dashboard-applications/blocks", { params: { userId, divisionCode } });

// ← NEW: panchayat-wise counts inside a block
export const fetchEICDashboardPanchayats = (userId, blockCode, application_status = "") =>
  API.get("/eic-dashboard-applications/panchayats", {
    params: { userId, blockCode, application_status },
  });

// ← UPDATED: added gramPanchayatCode param
export const fetchEICDashboardApplications = (
  userId,
  blockCode,
  application_status = "",
  gramPanchayatCode = ""
) =>
  API.get("/eic-dashboard-applications/applications", {
    params: { userId, blockCode, application_status, gramPanchayatCode },
  });

// ── EIC Overdue ───────────────────────────────────────────────────────────────
export const fetchEICOverdueSummary = (userId) =>
  API.get("/eic-dashboard/overdue-summary", { params: { userId } });

export const fetchEICOverdueByDivision = (userId, bucket) =>
  API.get("/eic-dashboard/overdue-by-division", { params: { userId, bucket } });

export const fetchEICOverdueApplicationsByDivision = (userId, divisionCode, bucket) =>
  API.get("/eic-dashboard/overdue-applications-by-division", {
    params: { userId, divisionCode, bucket },
  });

export const fetchEICOverdueApplicationHistory = (userId, applicationId) =>
  API.get("/eic-dashboard/overdue-application-history", {
    params: { userId, applicationId },
  });

// ── CE / EIC Application Received ────────────────────────────────────────────
export const fetchCEApplicationReceivedApplications = (userId, block_code, application_status) => {
  return API.get("/ce-application-received/applications", {
    params: { userId, block_code, application_status },
  });
};

export const fetchEICApplicationReceivedApplications = (userId, block_code, application_status) => {
  return API.get("/eic-application-received/applications", {
    params: { userId, block_code, application_status },
  });
};

// ── Organisation ──────────────────────────────────────────────────────────────
export const updateOrganisationStatus = (applicationId, application_status) => {
  return API.patch(
    `/organisation/organisations/${applicationId}/application-status`,
    { application_status }
  );
};

export const updateOrganisationStatusWithRemarks = (
  applicationId,
  application_status,
  remarks,
  is_return_to_je = false,
  userId = null
) => {
  return API.patch(
    `/organisation/organisations/${applicationId}/application-status`,
    { application_status, remarks, is_return_to_je, userId }
  );
};

export const updateReturnedApplicantOrganisation = (applicationId, data) => {
  return API.patch(`/applicant-application/returned-organisation/${applicationId}`, data);
};

// ── SE Payment ────────────────────────────────────────────────────────────────
export const fetchSEPaymentBlocks = (userId) => {
  return API.get("/se-payment-details/blocks", { params: { userId } });
};

export const fetchSEPaymentApplications = (userId, block_code) => {
  return API.get("/se-payment-details/applications", { params: { userId, block_code } });
};

export const fetchSEPaymentDetails = (userId, filters = {}) => {
  return API.get("/se-payment-details/payments", { params: { userId, ...filters } });
};

export const createSEPaymentDetail = (payload) => {
  return API.post("/se-payment-details/payments", payload);
};

// ── JE Payment ────────────────────────────────────────────────────────────────
export const fetchJEPaymentBlocks = (userId) => {
  return API.get("/je-payment-details/blocks", { params: { userId } });
};

export const fetchJEPaymentApplications = (userId, block_code) => {
  return API.get("/je-payment-details/applications", { params: { userId, block_code } });
};

export const fetchJEPaymentDetails = (userId, filters = {}) => {
  return API.get("/je-payment-details/payments", { params: { userId, ...filters } });
};

export const createJEPaymentDetail = (payload) => {
  return API.post("/je-payment-details/payments", payload);
};

// ── Documents / Reports ───────────────────────────────────────────────────────
export const uploadSiteVisitReport = (applicationId, file, inspectionDate, inspectionTime, remarks) => {
  const formData = new FormData();
  formData.append("site_visit_report", file);
  if (inspectionDate) formData.append("inspection_date", inspectionDate);
  if (inspectionTime) formData.append("inspection_time", inspectionTime);
  if (remarks?.trim()) formData.append("remarks", remarks.trim());

  return API.patch(
    `/organisation/organisations/${applicationId}/site-visit-report`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
};

export const getSiteVisitReportUrl = (applicationId) =>
  `${API.defaults.baseURL}/organisation/organisations/${applicationId}/site-visit-report`;

export const getOrganisationDocumentUrl = (applicationId, documentType) =>
  `${API.defaults.baseURL}/organisation/organisations/${applicationId}/documents/${documentType}`;

// ── Applicant ─────────────────────────────────────────────────────────────────
export const fetchApplicantApplicationCount = (userId) =>
  API.get(`/applicant-application/application-count/${userId}`);

export const fetchApplicantApplication = (userId) =>
  API.get(`/applicant-application/application/${userId}`);

export const checkSessionValid = (userId) =>
  API.get(`/applicant-application/check-session`, { params: { userId } });

// ── Pending / Approval ────────────────────────────────────────────────────────
export const fetchPendingForwardToJE = (userId) =>
  API.get("/pending-applications/forward-to-je", { params: { userId } });

export const fetchPendingApproval = (userId) =>
  API.get("/pending-applications/approval", { params: { userId } });

// ── Payment Verification ──────────────────────────────────────────────────────
export const fetchPaymentVerificationApplications = (userId) =>
  API.get("/payment-verification/applications", { params: { userId } });

export const verifyPaymentReceipt = (applicationId, action, remarks) =>
  API.patch(`/payment-verification/${applicationId}/verify`, { action, remarks });

// ── Connection Details ────────────────────────────────────────────────────────
export const fetchConnectionApplications = (blockCode) =>
  API.get("/officer/connection-details/applications", { params: { blockCode } });

export const submitConnectionDetails = (payload) =>
  API.post("/officer/connection-details/update", payload);

// ── SLA Config ────────────────────────────────────────────────────────────────
export const fetchSlaStages = () => API.get("/sla-config/stages");

export const saveSlaStage = (payload) => API.post("/sla-config/save", payload);

// CE pending pie chart
export const fetchCEPendingSummary = (userId) =>
  API.get("/ce-pending/summary", { params: { userId } });

export const fetchCEPendingByDivision = (userId, bucket) =>
  API.get("/ce-pending/by-division", { params: { userId, bucket } });

export const fetchCEPendingApplicationsByDivision = (userId, divisionCode, bucket) =>
  API.get("/ce-pending/applications-by-division", { params: { userId, divisionCode, bucket } });

export const fetchCEPendingApplicationHistory = (userId, applicationId) =>
  API.get("/ce-pending/application-history", { params: { userId, applicationId } });

// EIC pending pie chart
export const fetchEICPendingSummary = (userId) =>
  API.get("/eic-pending/summary", { params: { userId } });

export const fetchEICPendingByDivision = (userId, bucket) =>
  API.get("/eic-pending/by-division", { params: { userId, bucket } });

export const fetchEICPendingApplicationsByDivision = (userId, divisionCode, bucket) =>
  API.get("/eic-pending/applications-by-division", { params: { userId, divisionCode, bucket } });

export const fetchEICPendingApplicationHistory = (userId, applicationId) =>
  API.get("/eic-pending/application-history", { params: { userId, applicationId } });