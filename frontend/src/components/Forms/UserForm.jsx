import React, { useState, useEffect, useRef } from "react";
import { employeesAPI, authAPI } from "../../services/api";
import FloatingInput from "./FloatingInput";

const UserForm = ({ user, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
    permissions: [],
  });
  const [employees, setEmployees] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // Removed suggestions and showSuggestions states

  const permissionOptions = [
    "dashboard",
    "employee_master",
    "employee_access",
    "part_master",
    "customer_master",
    "project_master",
    "vendor_master",
    'customer_boq',
    'inhouse_boq',
    "milestone_management",
    "inhouse_milestone",
    "inventory_management",
    "quality_management",
    "payment_master",
    "project_budget",
    "logistic_expenditure",
    "project_expenditure",
    "purchase_request",
    "production_management",
    "reports",
    "receipts",
    "dispatches",
    "miscellaneous_expenditure"
  ];

  const roleOptions = [
    { value: "admin", label: "ADMIN" },
    { value: "project_manager", label: "PROJECT MANAGER" },
    { value: "3d_model", label: "3D MODEL" },
    { value: "artist", label: "ARTIST" },
  ];

  useEffect(() => {
    fetchEmployees();
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        password: "",
        confirmPassword: "",
        permissions: user.permissions || [],
      });
    } else {
      setFormData({
        name: "",
        email: "",
        role: "",
        password: "",
        confirmPassword: "",
        permissions: [],
      });
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll();
      setEmployees(response.data);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Updated handler for name selection from dropdown
  const handleNameChange = (e) => {
    const selectedName = e.target.value;
    const selectedEmployee = employees.find((emp) => emp.name === selectedName);

    setFormData((prev) => ({
      ...prev,
      name: selectedName,
      email: selectedEmployee ? selectedEmployee.email : "",
    }));

    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: "" }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handlePermissionChange = (permission) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const validatePassword = (password) => {
    const errors = [];

    if (password.length < 8)
      errors.push("Password must be at least 8 characters long");
    if (password.length > 30)
      errors.push("Password must not exceed 30 characters");
    if (!/[A-Z]/.test(password))
      errors.push("Password must contain at least one capital letter");
    if (!/\d/.test(password))
      errors.push("Password must contain at least one number");
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password))
      errors.push("Password must contain at least one special character");

    return errors;
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "None", color: "gray" };

    let score = 0;
    const errors = validatePassword(password);

    if (password.length >= 8 && password.length <= 30) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
    if (password.length >= 12) score++;

    if (score <= 2) return { strength: score, label: "Weak", color: "red" };
    if (score <= 3)
      return { strength: score, label: "Medium", color: "yellow" };
    if (score <= 4) return { strength: score, label: "Strong", color: "green" };
    return { strength: score, label: "Very Strong", color: "darkgreen" };
  };

  const PasswordRequirements = ({ password }) => {
    const requirements = [
      { test: password.length >= 8, text: "At least 8 characters" },
      { test: password.length <= 30, text: "Maximum 30 characters" },
      { test: /[A-Z]/.test(password), text: "At least one capital letter" },
      { test: /\d/.test(password), text: "At least one number" },
      {
        test: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
        text: "At least one special character",
      },
    ];

    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Password Requirements:
        </div>
        <div className="space-y-1">
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center text-xs">
              {req.test ? (
                <svg
                  className="w-4 h-4 text-green-500 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 text-gray-300 mr-2"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span
                className={
                  req.test ? "text-green-600 font-medium" : "text-gray-500"
                }
              >
                {req.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name) newErrors.name = "Name is required";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = "Email is invalid";
    if (!formData.role) newErrors.role = "Role is required";

    if (!user) {
      if (!formData.password) newErrors.password = "Password is required";
      else {
        const passwordErrors = validatePassword(formData.password);
        if (passwordErrors.length > 0)
          newErrors.password = passwordErrors.join(". ");
      }

      if (!formData.confirmPassword)
        newErrors.confirmPassword = "Please confirm your password";
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }

    if (formData.permissions.length === 0)
      newErrors.permissions = "At least one permission is required";

    if (user && formData.password) {
      const passwordErrors = validatePassword(formData.password);
      if (passwordErrors.length > 0)
        newErrors.password = passwordErrors.join(". ");

      if (!formData.confirmPassword)
        newErrors.confirmPassword = "Please confirm your password";
      else if (formData.password !== formData.confirmPassword)
        newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = { ...formData };
      delete submitData.confirmPassword;

      if (user) {
        if (!submitData.password) delete submitData.password;
        await authAPI.updateUser(user._id, submitData);
      } else {
        await authAPI.createUser(submitData);
      }
      onSubmit();
    } catch (error) {
      setErrors({
        submit:
          error.response?.data?.message ||
          "An error occurred. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="h-full flex flex-col">
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto max-h-[75vh] px-1 py-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
        <div className="space-y-6">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {errors.submit}
            </div>
          )}

          {/* Name field as dropdown */}
          <FloatingInput
            label="Name"
            name="name"
            type="select"
            value={formData.name}
            onChange={handleNameChange}
            error={errors.name}
            required={true}
            options={[
              { value: "", label: "Select an employee", disabled: true },
              ...employees.map((employee) => ({
                value: employee.name,
                label: employee.name,
              })),
            ]}
            className="mb-4"
          />

          <FloatingInput
            type="email"
            label="Email"
            name="email"
            value={formData.email}
            readOnly={true}
            error={errors.email}
            required={true}
          />

          <FloatingInput
            type="select"
            label="Role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            options={roleOptions}
            error={errors.role}
            required={true}
          />

          <FloatingInput
            type="password"
            label={
              user ? "New Password (leave blank to keep current)" : "Password"
            }
            name="password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password}
            required={!user}
          />

          {formData.password && (
            <div className="mt-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600">
                  Password Strength:
                </span>
                <span
                  className={`text-xs font-medium ${
                    getPasswordStrength(formData.password).color === "red"
                      ? "text-red-600"
                      : getPasswordStrength(formData.password).color ===
                        "yellow"
                      ? "text-yellow-600"
                      : getPasswordStrength(formData.password).color === "green"
                      ? "text-green-600"
                      : "text-green-800"
                  }`}
                >
                  {getPasswordStrength(formData.password).label}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    getPasswordStrength(formData.password).strength <= 2
                      ? "bg-red-500 w-1/4"
                      : getPasswordStrength(formData.password).strength <= 3
                      ? "bg-yellow-500 w-1/2"
                      : getPasswordStrength(formData.password).strength <= 4
                      ? "bg-green-500 w-3/4"
                      : "bg-green-700 w-full"
                  }`}
                />
              </div>
            </div>
          )}

          {formData.password && (
            <PasswordRequirements password={formData.password} />
          )}

          <FloatingInput
            type="password"
            label={user ? "Confirm New Password" : "Confirm Password"}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required={!user}
          />

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Permissions
            </label>
            {errors.permissions && (
              <p className="text-red-500 text-xs mt-1">{errors.permissions}</p>
            )}

            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-4 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {permissionOptions.map((permission) => {
                  const isActive = formData.permissions.includes(permission);
                  return (
                    <div
                      key={permission}
                      className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700 capitalize">
                        {permission.replace("_", " ")}
                      </span>

                      <button
                        type="button"
                        onClick={() => handlePermissionChange(permission)}
                        className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                          isActive ? "bg-primary-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                            isActive ? "translate-x-5" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              {formData.permissions.length} of {permissionOptions.length}{" "}
              permissions selected
            </div>
          </div>
        </div>
      </div>

      {/* FIXED BOTTOM BUTTONS */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-white pt-4 mt-4">
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : user ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default UserForm;
