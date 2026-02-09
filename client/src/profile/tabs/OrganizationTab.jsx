import React, { useContext, useEffect, useState } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import { getOrganization, updateOrganization } from "../../../api/profile"; // Ensure updateOrganization is imported
import { EmployContext } from "../../context/EmployContextProvider";
import { AuthContext } from "../../context/AuthContextProvider";
import Loader from "../../components/Loader";
import { toast } from "react-hot-toast";

const OrganizationTab = ({ isEditing, cancelEdit }) => {
  const [org, setOrg] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const { setOrgAddress } = useContext(EmployContext);
  const { token } = useContext(AuthContext);

  const user = JSON.parse(localStorage.getItem("user"));
  const emp_id = user?.emp_id;
  const isAdmin = user?.role?.toLowerCase() === "admin";

  useEffect(() => {
    fetchOrgData();
  }, [token, emp_id]);

  const fetchOrgData = async () => {
    setLoading(true);
    try {
      const res = await getOrganization();
      const orgDetails = res.data?.organizationDetails || res.data?.data || res.data || {};
      setOrg(orgDetails);
      setOrgAddress(orgDetails);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const newErrors = {};
    const hiddenFields = ["is_active", "created_at", "id"];
    
    // Validation: Check all visible fields
    Object.keys(org).forEach((key) => {
      if (!hiddenFields.includes(key)) {
        if (!org[key] || org[key].toString().trim() === "") {
          const fieldName = key.replace(/_/g, " ").toUpperCase();
          newErrors[key] = `${fieldName} IS REQUIRED`;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors below");
      return;
    }

    try {
      // Logic: Update the organization details
      // If your API requires emp_id or a specific org ID, pass it here
      await updateOrganization(org); 
      
      toast.success("Organization Data Saved");
      setErrors({});
      if (cancelEdit) cancelEdit(); // Switch back to view mode
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to save organization data");
    }
  };

  const handleChange = (key, value) => {
    setOrg((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[key];
        return newErrs;
      });
    }
  };

  const hiddenFields = ["is_active", "created_at", "id"];
  const displayFields = Object.keys(org).filter((key) => !hiddenFields.includes(key));

  return (
    <>
      <FormCard title="">
        {loading ? (
          <div className="flex justify-center items-center p-10">
            <Loader />
          </div>
        ) : displayFields.length > 0 ? (
          displayFields.map((key) => (
            <div key={key} className="flex flex-col mb-3">
              <Input
                label={key.replace(/_/g, " ").toUpperCase()}
                value={org[key] || ""}
                disabled={!(isAdmin && isEditing)}
                onChange={(e) => handleChange(key, e.target.value)}
              />
              {isAdmin && isEditing && errors[key] && (
                <p className="text-red-500 text-[10px] mt-1 font-bold italic">
                  * {errors[key]}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="p-10 text-center">
            <p>No organization records found.</p>
          </div>
        )}
      </FormCard>

      {isAdmin && isEditing && (
        <div className="flex justify-end gap-3 mt-2 p-3">
          <button className="px-4 py-2 bg-gray-200 rounded" onClick={cancelEdit}>
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={handleSave}
          >
            Save Organization
          </button>
        </div>
      )}
    </>
  );
};

export default OrganizationTab;