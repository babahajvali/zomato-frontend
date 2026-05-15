import { useMemo, useState } from "react";

const COLORS = {
  primary: "#F97316",
  error: "#EF4444",
  success: "#22C55E",
  border: "#D1D5DB",
  text: "#1F2937",
  muted: "#6B7280",
  bg: "#FFFFFF",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateField(name, values) {
  const value = values[name];
  switch (name) {
    case "fullName":
      if (!value || !value.trim()) return "Full name is required";
      if (value.trim().length < 2)
        return "Full name must be at least 2 characters";
      return "";
    case "email":
      if (!value || !value.trim()) return "Email is required";
      if (!EMAIL_RE.test(value.trim()))
        return "Enter a valid email address";
      return "";
    case "phone":
      if (!value || !value.trim()) return "Phone number is required";
      if (!/^\d{10}$/.test(value.trim()))
        return "Phone must be exactly 10 digits";
      return "";
    case "password":
      if (!value) return "Password is required";
      if (value.length < 8) return "Password must be at least 8 characters";
      if (!/[A-Z]/.test(value))
        return "Password must contain at least 1 uppercase letter";
      if (!/[0-9]/.test(value))
        return "Password must contain at least 1 number";
      return "";
    case "confirmPassword":
      if (!value) return "Please confirm your password";
      if (value !== values.password) return "Passwords do not match";
      return "";
    default:
      return "";
  }
}

export default function UserProfileForm({
  mode = "signup",
  userData = null,
  onSubmit,
  isSubmitting = false,
}) {
  const isSignup = mode === "signup";

  const [values, setValues] = useState(() => ({
    fullName: userData?.fullName || "",
    email: userData?.email || "",
    phone: userData?.phone || "",
    password: "",
    confirmPassword: "",
    role: userData?.role || "customer",
    profilePhotoFile: null,
    profilePhotoPreview: userData?.profilePhoto || "",
  }));
  const [touched, setTouched] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const activeFields = useMemo(() => {
    if (isSignup)
      return ["fullName", "email", "phone", "password", "confirmPassword"];
    const base = ["fullName", "email", "phone"];
    if (changePassword) base.push("password", "confirmPassword");
    return base;
  }, [isSignup, changePassword]);

  const errors = useMemo(() => {
    const result = {};
    activeFields.forEach((field) => {
      const message = validateField(field, values);
      if (message) result[field] = message;
    });
    return result;
  }, [activeFields, values]);

  const isValid = Object.keys(errors).length === 0;
  const submitDisabled = !isValid || isSubmitting;

  const setValue = (name, value) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleBlur = (name) => {
    setFocusedField(null);
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handlePhoneChange = (raw) => {
    setValue("phone", raw.replace(/\D/g, "").slice(0, 10));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setValues((prev) => ({
      ...prev,
      profilePhotoFile: file,
      profilePhotoPreview: URL.createObjectURL(file),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const allTouched = {};
    activeFields.forEach((field) => {
      allTouched[field] = true;
    });
    setTouched((prev) => ({ ...prev, ...allTouched }));
    if (!isValid) return;

    const formData = {
      fullName: values.fullName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
    };
    if (isSignup) {
      formData.role = values.role;
      formData.password = values.password;
    } else {
      formData.profilePhoto = values.profilePhotoFile || null;
      if (changePassword) formData.password = values.password;
    }

    try {
      const result = await onSubmit?.(formData);
      // Parent can signal failure by returning false or throwing —
      // in that case we keep the form open and skip the success banner.
      if (result === false) return;
      setSuccessMessage(
        isSignup
          ? "Account created successfully!"
          : "Profile updated successfully!"
      );
    } catch {
      // Parent surfaces its own error; do not show success.
    }
  };

  const fieldBorderColor = (name) => {
    if (touched[name] && errors[name]) return COLORS.error;
    if (focusedField === name) return COLORS.primary;
    if (touched[name] && !errors[name]) return COLORS.success;
    return COLORS.border;
  };

  const inputStyle = (name) => ({
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    fontSize: 15,
    color: COLORS.text,
    background: COLORS.bg,
    border: `1.5px solid ${fieldBorderColor(name)}`,
    borderRadius: 8,
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxShadow:
      focusedField === name
        ? `0 0 0 3px rgba(249, 115, 22, 0.15)`
        : "none",
  });

  const renderError = (name) =>
    touched[name] && errors[name] ? (
      <span className="upf-error-text">{errors[name]}</span>
    ) : null;

  const sharedFieldProps = (name) => ({
    onFocus: () => setFocusedField(name),
    onBlur: () => handleBlur(name),
    style: inputStyle(name),
  });

  return (
    <div className="upf-wrapper">
      <style>{`
        .upf-wrapper {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #F9FAFB;
          min-height: 100%;
          padding: 24px 16px 0;
        }
        .upf-card {
          width: 100%;
          background: ${COLORS.bg};
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .upf-title { margin: 0; font-size: 22px; color: ${COLORS.text}; }
        .upf-subtitle { margin: 0; font-size: 14px; color: ${COLORS.muted}; }
        .upf-field { display: flex; flex-direction: column; gap: 6px; }
        .upf-label { font-size: 13px; font-weight: 600; color: ${COLORS.text}; }
        .upf-error-text { font-size: 12px; color: ${COLORS.error}; }
        .upf-password-wrap { position: relative; }
        .upf-toggle-btn {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: ${COLORS.primary};
          font-size: 12px; font-weight: 600; cursor: pointer; padding: 4px 6px;
        }
        .upf-segmented {
          display: flex; border: 1.5px solid ${COLORS.border};
          border-radius: 8px; overflow: hidden;
        }
        .upf-segment {
          flex: 1; padding: 10px; font-size: 14px; font-weight: 600;
          background: ${COLORS.bg}; color: ${COLORS.muted};
          border: none; cursor: pointer; transition: background 0.2s ease, color 0.2s ease;
        }
        .upf-segment.active { background: ${COLORS.primary}; color: #fff; }
        .upf-link-btn {
          background: none; border: none; color: ${COLORS.primary};
          font-size: 14px; font-weight: 600; cursor: pointer; padding: 0;
          text-align: left;
        }
        .upf-photo-row { display: flex; align-items: center; gap: 14px; }
        .upf-photo-preview {
          width: 64px; height: 64px; border-radius: 50%; object-fit: cover;
          border: 2px solid ${COLORS.border}; background: #F3F4F6;
        }
        .upf-photo-placeholder {
          width: 64px; height: 64px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          background: #F3F4F6; border: 2px solid ${COLORS.border};
          color: ${COLORS.muted}; font-size: 12px;
        }
        .upf-submit {
          width: 100%; padding: 13px; font-size: 16px; font-weight: 700;
          color: #fff; background: ${COLORS.primary}; border: none;
          border-radius: 8px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s ease, opacity 0.2s ease;
        }
        .upf-submit:disabled { opacity: 0.55; cursor: not-allowed; }
        .upf-banner {
          background: #ECFDF5; color: #047857; border: 1px solid #A7F3D0;
          padding: 10px 12px; border-radius: 8px; font-size: 14px; font-weight: 600;
        }
        .upf-spinner {
          width: 16px; height: 16px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
          animation: upf-spin 0.7s linear infinite;
        }
        @keyframes upf-spin { to { transform: rotate(360deg); } }
        .upf-submit-bar { margin-top: 4px; padding-bottom: 24px; }

        @media (max-width: 767px) {
          .upf-wrapper { padding: 16px 12px 0; }
          .upf-submit-bar {
            position: sticky; bottom: 0; background: #F9FAFB;
            padding: 12px 0 16px; margin: 0 -12px;
            padding-left: 12px; padding-right: 12px;
            box-shadow: 0 -2px 8px rgba(0,0,0,0.06);
          }
        }
        @media (min-width: 768px) {
          .upf-card {
            max-width: 480px; margin: 0 auto 32px;
            padding: 28px; border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.08);
          }
        }
      `}</style>

      <form className="upf-card" onSubmit={handleSubmit} noValidate>
        <div>
          <h2 className="upf-title">
            {isSignup ? "Create your account" : "Update profile"}
          </h2>
          <p className="upf-subtitle">
            {isSignup
              ? "Join Bake & Bloom in a few steps."
              : "Keep your account details up to date."}
          </p>
        </div>

        {successMessage ? (
          <div className="upf-banner">{successMessage}</div>
        ) : null}

        {/* Full Name */}
        <div className="upf-field">
          <label className="upf-label" htmlFor="upf-fullName">
            Full Name
          </label>
          <input
            id="upf-fullName"
            type="text"
            value={values.fullName}
            onChange={(e) => setValue("fullName", e.target.value)}
            placeholder="Jane Doe"
            {...sharedFieldProps("fullName")}
          />
          {renderError("fullName")}
        </div>

        {/* Email */}
        <div className="upf-field">
          <label className="upf-label" htmlFor="upf-email">
            Email
          </label>
          <input
            id="upf-email"
            type="email"
            value={values.email}
            onChange={(e) => setValue("email", e.target.value)}
            placeholder="jane@example.com"
            {...sharedFieldProps("email")}
          />
          {renderError("email")}
        </div>

        {/* Phone */}
        <div className="upf-field">
          <label className="upf-label" htmlFor="upf-phone">
            Phone Number
          </label>
          <input
            id="upf-phone"
            type="tel"
            inputMode="numeric"
            value={values.phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="10-digit mobile number"
            {...sharedFieldProps("phone")}
          />
          {renderError("phone")}
        </div>

        {/* Profile Photo — update mode only */}
        {!isSignup && (
          <div className="upf-field">
            <label className="upf-label" htmlFor="upf-photo">
              Profile Photo
            </label>
            <div className="upf-photo-row">
              {values.profilePhotoPreview ? (
                <img
                  className="upf-photo-preview"
                  src={values.profilePhotoPreview}
                  alt="Profile preview"
                />
              ) : (
                <div className="upf-photo-placeholder">No photo</div>
              )}
              <input
                id="upf-photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ fontSize: 13, color: COLORS.muted }}
              />
            </div>
          </div>
        )}

        {/* Role — signup mode only */}
        {isSignup && (
          <div className="upf-field">
            <span className="upf-label">I am a</span>
            <div className="upf-segmented" role="radiogroup" aria-label="Role">
              {[
                { value: "customer", label: "Customer" },
                { value: "owner", label: "Restaurant Owner" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={values.role === option.value}
                  className={
                    "upf-segment" +
                    (values.role === option.value ? " active" : "")
                  }
                  onClick={() => setValue("role", option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Change Password toggle — update mode only */}
        {!isSignup && !changePassword && (
          <button
            type="button"
            className="upf-link-btn"
            onClick={() => setChangePassword(true)}
          >
            Change Password
          </button>
        )}

        {/* Password + Confirm — signup always, update only when toggled */}
        {(isSignup || changePassword) && (
          <>
            <div className="upf-field">
              <label className="upf-label" htmlFor="upf-password">
                {isSignup ? "Password" : "New Password"}
              </label>
              <div className="upf-password-wrap">
                <input
                  id="upf-password"
                  type={showPassword ? "text" : "password"}
                  value={values.password}
                  onChange={(e) => setValue("password", e.target.value)}
                  placeholder="Min 8 chars, 1 uppercase, 1 number"
                  {...sharedFieldProps("password")}
                />
                <button
                  type="button"
                  className="upf-toggle-btn"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {renderError("password")}
            </div>

            <div className="upf-field">
              <label className="upf-label" htmlFor="upf-confirmPassword">
                Confirm Password
              </label>
              <div className="upf-password-wrap">
                <input
                  id="upf-confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={values.confirmPassword}
                  onChange={(e) =>
                    setValue("confirmPassword", e.target.value)
                  }
                  placeholder="Re-enter password"
                  {...sharedFieldProps("confirmPassword")}
                />
                <button
                  type="button"
                  className="upf-toggle-btn"
                  onClick={() => setShowConfirm((s) => !s)}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
              {renderError("confirmPassword")}
            </div>

            {!isSignup && (
              <button
                type="button"
                className="upf-link-btn"
                onClick={() => {
                  setChangePassword(false);
                  setValues((prev) => ({
                    ...prev,
                    password: "",
                    confirmPassword: "",
                  }));
                  setTouched((prev) => ({
                    ...prev,
                    password: false,
                    confirmPassword: false,
                  }));
                }}
              >
                Cancel password change
              </button>
            )}
          </>
        )}

        <div className="upf-submit-bar">
          <button
            type="submit"
            className="upf-submit"
            disabled={submitDisabled}
          >
            {isSubmitting && <span className="upf-spinner" />}
            {isSignup ? "Create Account" : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
