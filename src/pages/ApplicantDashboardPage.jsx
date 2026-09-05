import { useNavigate } from "react-router";
import { Ban, FilePenLine, FileText, Droplets } from "lucide-react";
import { useMemo, useEffect, useState } from "react";
import { fetchApplicantApplication, fetchApplicantApplicationCount } from "../api/api";
import { formatApplicationStatus } from "../utils/applicationStatus";

const CONNECTION_DETAILS_STATUSES = new Set([
  "CONNECTION_DETAILS_UPDATED",
  // "UPDTAED_CONNECTION_DETAILS",
]);

function ApplicantDashboardPage() {
  const navigate = useNavigate();
  const [applicationCount, setApplicationCount] = useState(null);
  const [applicationStatus, setApplicationStatus] = useState("");
  const [application, setApplication] = useState(null);

  const applicantSession = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("applicantSession") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!applicantSession?.id) return;

    const loadCount = async () => {
      try {
        const [countResponse, applicationResponse] = await Promise.all([
          fetchApplicantApplicationCount(applicantSession.id),
          fetchApplicantApplication(applicantSession.id).catch(() => null),
        ]);
        //console.log("API response:", response.data); // check this in browser console
        setApplicationCount(Number(countResponse.data?.total ?? 0));
        const loadedApplication = applicationResponse?.data?.application || null;
        setApplication(loadedApplication);
        setApplicationStatus(
          String(loadedApplication?.connection_application_status || loadedApplication?.application_status || "").toUpperCase()
        );
      } catch {
        //console.error("Failed to fetch application count:", error);
        setApplicationCount(0);
      }
    };

    loadCount();
  }, [applicantSession]);

  if (!applicantSession?.id) return null;

  const canRequestService =
    CONNECTION_DETAILS_STATUSES.has(applicationStatus) && Boolean(application?.consumer_id);
  const isTransferAuthorization = Boolean(
    application?.transfer_user_flag &&
    application?.request_type === "CANCELLATION" &&
    String(application?.transfer_user_id) === String(applicantSession.id)
  );
  const hasConnectionApplication = Boolean(
    application?.connection_application_id && application?.consumer_id && !isTransferAuthorization
  );
  const cancellationSubmitted = Boolean(application?.cancellation_request_status) && !application?.transfer_user_flag;
  const amendmentSubmitted = Boolean(application?.amendment_request_status);

  return (
    <>
      <section className="applicant-dashboard-stats">

  {/* Total Applications */}
  <article className="applicant-stat-card">
    <div className="applicant-stat-card__icon">
      <FileText size={20} />
    </div>

    <strong>
      {applicationCount === null ? "..." : applicationCount}
    </strong>

    <span>No. of Applications</span>
  </article>

  {/* Apply Water Connection */}
  <article
    className="applicant-stat-card applicant-stat-card--clickable"
    onClick={() => navigate("/applicant-organisation-registration")}
  >
    <div className="applicant-stat-card__icon applicant-stat-card__icon--blue">
      <Droplets size={20} />
    </div>

    <strong>{hasConnectionApplication ? "Already Submitted" : "Apply"}</strong>

    <span>{hasConnectionApplication ? "Water Connection Application" : "Apply for Water Connection"}</span>
  </article>

  <>
      <article
        className="applicant-stat-card applicant-stat-card--clickable"
        onClick={() => navigate("/applicant-cancellation")}
      >
        <div className="applicant-stat-card__icon applicant-stat-card__icon--red">
          <Ban size={20} />
        </div>

        <strong>{cancellationSubmitted ? "Already Submitted" : "Apply"}</strong>

        <span>
          {cancellationSubmitted
            ? `Cancellation: ${formatApplicationStatus(application.cancellation_request_status)}`
            : "Apply For Cancellation/Transfer"}
        </span>
      </article>

      <article
        className="applicant-stat-card applicant-stat-card--clickable"
        onClick={() => navigate("/applicant-amendment")}
      >
        <div className="applicant-stat-card__icon applicant-stat-card__icon--green">
          <FilePenLine size={20} />
        </div>

        <strong>{amendmentSubmitted ? "Already Submitted" : "Apply"}</strong>

        <span>
          {amendmentSubmitted
            ? `Amendment: ${formatApplicationStatus(application.amendment_request_status)}`
            : "Apply For Amendment"}
        </span>
      </article>
  </>

</section>

      
    </>
  );
}

export default ApplicantDashboardPage;
