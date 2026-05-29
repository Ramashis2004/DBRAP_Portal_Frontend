import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { checkApplicantMobile, registerApplicant } from "../api/api";
import axios from "axios";
import Swal from "sweetalert2";

const swalSuccess = (title, text) =>
  Swal.fire({ icon: "success", title, text, confirmButtonColor: "#3d1f0f" });

const swalError = (title, text) =>
  Swal.fire({ icon: "error", title, text, confirmButtonColor: "#3d1f0f" });

const swalWarning = (title, text) =>
  Swal.fire({ icon: "warning", title, text, confirmButtonColor: "#3d1f0f" });

function RegisterForm() {
  const navigate = useNavigate();

  const createInitialFormData = () => ({
    name: "",
    organisation_name: "",
    gender: "",
    email: "",
    mobile_number: ""
  });

  const [step, setStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState("");
  const [mobileError, setMobileError] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(createInitialFormData());
  const [resendTimer, setResendTimer] = useState(0);
  const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

  const validateMobile = (number) => {
    if (!number) return "Mobile number is required.";
    if (!/^[6-9]\d{9}$/.test(number)) return "Enter a valid 10-digit Indian mobile number (starts with 6-9).";
    return "";
  };

  const validateApplicantDetails = () =>
  Boolean(formData.name && formData.organisation_name && formData.gender && formData.email && formData.mobile_number);

  const handleMobileChange = (e) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10);
    setMobileNumber(val);
    setMobileError(validateMobile(val));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const resetRegistrationForm = () => {
    setStep(1);
    setMobileNumber("");
    setMobileError("");
    setOtpInput("");
    setSentOtp("");
    setIsLoading(false);
    setFormData(createInitialFormData());
  };

  const sendOTP = async () => {
    const error = validateMobile(mobileNumber);
    if (error) {
      setMobileError(error);
      return;
    }

    setIsLoading(true);
    setOtpInput(""); // ✅ ADD THIS — clears stale OTP on every new send
  setSentOtp("");
    let otp = "";
    try {
      const availabilityResponse = await checkApplicantMobile(mobileNumber);

      if (availabilityResponse.data?.exists) {
        await swalWarning("User Exists", "An applicant with this mobile number already exists.");
        return;
      }

      otp = generateOTP();
      setSentOtp(otp);

      const data = new FormData();
      data.append("template_id", "1007529288081313959");
      data.append("phonenumber", mobileNumber);
      data.append("department_id", "D047009");
      data.append("action", "sendOTPSMS");
      data.append("source", "ODIGOV");
      data.append(
        "sms_content",
        `Your OTP for Gramsewa Nidhi Portal is ${otp}. Please do not share this with anyone. Panchayati Raj & Drinking Water Dept. - Govt. of Odisha`
      );
      console.log("OTP sent successfully. Mobile Number:", mobileNumber);
      await axios.post("https://govtsms.odisha.gov.in/api/api.php", data);
      await swalSuccess("OTP Sent!", `OTP has been sent to ${mobileNumber}.`);
      setStep(2);
      setResendTimer(30);
    } catch (err) {
      if (err.response?.data?.error) {
        await swalError("Registration Failed", err.response.data.error);
        return;
      }

      console.error("OTP Error:", err);
      console.log("BYPASS: OTP is " + otp);
      await swalWarning(
        "SMS Gateway Error",
        "Could not send OTP via SMS. Check the console for the OTP (testing mode)."
      );
      setStep(2);
      setResendTimer(30);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otpInput === sentOtp) {
      await swalSuccess("Verified!", "Your mobile number has been verified successfully.");
      setFormData((prev) => ({ ...prev, mobile_number: mobileNumber }));
      setStep(3);
    } else {
      await swalError("Invalid OTP", "The OTP you entered is incorrect. Please try again.");
    }
  };
useEffect(() => {
  if (resendTimer <= 0) return;
  const interval = setInterval(() => {
    setResendTimer((t) => t - 1);
  }, 1000);
  return () => clearInterval(interval);
}, [resendTimer]);
  const submitRegistration = async () => {
    Swal.fire({
      title: "Submitting...",
      text: "Please wait while we register the applicant.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const response = await registerApplicant(formData);
      const userId = response.data?.data?.id;

      await Swal.fire({
        icon: "success",
        title: "Applicant Registered!",
        html: userId
          ? `Applicant has been registered.<br/><br/>
             <div style="margin-top:8px;font-weight:700;color:#4b5563;">User ID:</div>
             <div style="margin-top:10px;">
               <span style="display:inline-block;font-size:1.2rem;font-family:monospace;background:#fef3c7;padding:6px 14px;border-radius:6px;font-weight:700;color:#92400e;">
                 ${userId}
               </span>
             </div><br/>
             <small style="color:#6b7280;">Please save this ID for future reference.</small>`
          : "Applicant has been registered successfully.",
        confirmButtonColor: "#3d1f0f",
        confirmButtonText: "Done"
      });

      resetRegistrationForm();
    } catch (error) {
      console.error(error);
      await swalError(
        "Registration Failed",
        error.response?.data?.error || "Something went wrong. Please try again."
      );
    } finally {
      Swal.close();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateApplicantDetails()) {
      await swalWarning("Incomplete Fields", "Please complete all required applicant details before submitting.");
      return;
    }
    await submitRegistration();
  };

  return (
    <div className="form-container">
      <button type="button" className="back-btn" onClick={() => navigate("/")}>
        &larr; Back to Home
      </button>
      <h2>Applicant Registration</h2>

      {step === 1 && (
        <div className="otp-section" style={{ padding: "40px", textAlign: "center" }}>
          <h3>Mobile Verification</h3>
          <p style={{ color: "#795548", marginBottom: "20px" }}>Enter your mobile number to receive an OTP</p>

          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <input
              type="text"
              placeholder="Enter 10 Digit Mobile Number"
              value={mobileNumber}
              onChange={handleMobileChange}
              style={{
                width: "100%",
                textAlign: "center",
                fontSize: "1.1rem",
                border: mobileError && mobileNumber.length > 0 ? "1.5px solid #e53e3e" : "1.5px solid #d1d5db",
                borderRadius: "8px",
                padding: "10px 14px",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: "6px"
              }}
            />

            {mobileError && mobileNumber.length > 0 && (
              <p style={{ color: "#e53e3e", fontSize: "0.82rem", marginBottom: "10px", textAlign: "left" }}>
                Warning: {mobileError}
              </p>
            )}
            {!mobileError && mobileNumber.length === 10 && (
              <p style={{ color: "#16a34a", fontSize: "0.82rem", marginBottom: "10px", textAlign: "left" }}>
                Valid mobile number
              </p>
            )}

            <button
              onClick={sendOTP}
              className="submit-btn"
              disabled={Boolean(mobileError) || mobileNumber.length !== 10 || isLoading}
              style={{
                opacity: Boolean(mobileError) || mobileNumber.length !== 10 ? 0.5 : 1,
                cursor: Boolean(mobileError) || mobileNumber.length !== 10 ? "not-allowed" : "pointer"
              }}
            >
              {isLoading ? "Sending..." : "Send OTP"}
            </button>
            <p style={{ marginTop: "16px", color: "#795548", fontSize: "1.1rem" }}>
  Already registered?{" "}
  <span
    onClick={() => navigate("/applicant-login")}
    style={{
      color: "#4a72e9",
      fontWeight: 600,
      cursor: "pointer",
      textDecoration: "underline"
    }}
  >
    Click Here to Sign In
  </span>
</p>
          </div>
        </div>
      )}

{step === 2 && (
  <div className="otp-section" style={{ padding: "40px", textAlign: "center" }}>
    <h3>Enter OTP</h3>
    <p style={{ color: "#795548", marginBottom: "20px" }}>OTP sent to {mobileNumber}</p>
    <div style={{ maxWidth: "380px", margin: "0 auto" }}>
      
      {/* ✅ Input + Resend side by side */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="Enter 6-Digit OTP"
          value={otpInput}
          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "1.2rem",
            letterSpacing: "5px",
            padding: "10px",
            border: "1.5px solid #d1d5db",
            borderRadius: "8px",
            outline: "none"
          }}
        />
        <button
          type="button"
          onClick={async () => {
            setResendTimer(30);
            setOtpInput("");
            await sendOTP();
          }}
          disabled={resendTimer > 0 || isLoading}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1.5px solid #5d4037",
            background: resendTimer > 0 ? "#f5f5f5" : "#3d1f0f",
            color: resendTimer > 0 ? "#3043d5" : "#fff",
            fontWeight: 800,
            fontSize: "0.82rem",
            cursor: resendTimer > 0 ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
            minWidth: "90px"
          }}
        >
          {resendTimer > 0 ? `${resendTimer}s` : "Resend OTP"}
        </button>
      </div>

      <button onClick={verifyOTP} className="submit-btn" disabled={otpInput.length !== 6}>
        Verify OTP
      </button>
      <p
  onClick={() => {
    setStep(1);
    setOtpInput(""); // ✅ clear OTP input
    setSentOtp("");  // ✅ clear sent OTP too
  }}
  style={{ marginTop: "20px", color: "#5d4037", cursor: "pointer", textDecoration: "underline" }}
>
  Change Mobile Number
</p>
    </div>
  </div>
)}
      {step === 3 && (
        <form onSubmit={handleSubmit}>
          <div className="wizard-content">
            <div className="wizard-panel">
              <div className="form-fields">
                <div className="field-group">
  <div className="field-label">Name: <b style={{color:"#c0392b"}}>*</b></div>
  <div className="field-input-wrapper">
    <input type="text" name="name" value={formData.name} onChange={handleChange} required />
  </div>
</div>
<div className="field-group">
  <div className="field-label">Name of Organisation: <b style={{color:"#c0392b"}}>*</b></div>
  <div className="field-input-wrapper">
    <input type="text" name="organisation_name" value={formData.organisation_name} onChange={handleChange} required placeholder="Enter organisation name" />
  </div>
</div>
<div className="field-group">
  <div className="field-label">Gender: <b style={{color:"#c0392b"}}>*</b></div>
  <div className="field-input-wrapper">
    <select name="gender" value={formData.gender} onChange={handleChange} required>
      <option value="">Select Gender</option>
      <option value="Male">Male</option>
      <option value="Female">Female</option>
      <option value="Other">Other</option>
    </select>
  </div>
</div>
<div className="field-group">
  <div className="field-label">Email: <b style={{color:"#c0392b"}}>*</b></div>
  <div className="field-input-wrapper">
    <input type="email" name="email" value={formData.email} onChange={handleChange} required />
  </div>
</div>
<div className="field-group">
  <div className="field-label">Mobile Number: <b style={{color:"#c0392b"}}>*</b></div>
  <div className="field-input-wrapper">
    <input type="text" name="mobile_number" value={formData.mobile_number} readOnly disabled style={{ background: "#f5f5f5" }} />
  </div>
</div>
              </div>
            </div>

            <div className="submit-container wizard-actions">
              <button type="button" className="wizard-btn secondary" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="submit" className="wizard-btn primary">
                Submit Registration
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}


export default RegisterForm;
