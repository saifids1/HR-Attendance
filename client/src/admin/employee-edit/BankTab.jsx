import React, { useContext, useEffect, useState, useCallback, useRef } from "react";
import Input from "../../components/Input";
import Loader from "../../components/Loader";
import { toast } from "react-hot-toast";
import { addBank, updateBank, getBank } from "../../../api/profile";
import { emptyBank } from "../../constants/emptyData";
import { AuthContext } from "../../context/AuthContextProvider";
import { useParams } from "react-router-dom";

const BankTab = ({ isEditing, setIsEditing }) => {
  const { emp_id } = useParams();
  const { token } = useContext(AuthContext);
  const isFetched = useRef(false);

  // States
  const [draft, setDraft] = useState([{ ...emptyBank }]);
  const [originalDraft, setOriginalDraft] = useState([{ ...emptyBank }]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Fetch Bank Details Logic
  const fetchBankDetails = useCallback(async (isSilent = false) => {
    if (!emp_id) return;
    if (!isSilent) setLoading(true);

    try {
      const res = await getBank(emp_id);

      console.log("res",res);
      const bankData = res?.data?.bankDetails;

      console.log("bankData",bankData);

      // Ensure bankData is treated as an array for the .map function
      const normalizedData = Array.isArray(bankData) ? bankData : bankData ? [bankData] : [];

      if (normalizedData.length > 0) {
        const mapped = normalizedData.map((b) => ({
          ...emptyBank,
          ...b, // This automatically fills existing fields from DB
          is_active: b.is_active ?? true,
        }));

        setDraft(mapped);
        setOriginalDraft(mapped);
      } else {
        // No data: reset to dummy/empty
        setDraft([{ ...emptyBank }]);
        setOriginalDraft([{ ...emptyBank }]);
      }
    } catch (err) {
      console.error("Fetch Bank Error:", err);
      // Fallback for 404 (No record exists)
      if (err.response?.status === 404) {
        setDraft([{ ...emptyBank }]);
        setOriginalDraft([{ ...emptyBank }]);
      } else if (!isSilent) {
        toast.error("Failed to load bank records");
      }
    } finally {
      setLoading(false);
    }
  }, [emp_id]);

  // Combined Effect: Only fetch when token and emp_id are ready
  useEffect(() => {
    if (token && emp_id && !isFetched.current) {
      fetchBankDetails();
      isFetched.current = true;
    }
  }, [emp_id, fetchBankDetails, token]);

  const handleInputChange = (index, key, value) => {
    const updatedDraft = [...draft];
    updatedDraft[index] = { ...updatedDraft[index], [key]: value };
    setDraft(updatedDraft);

    // Clear specific error when user types
    if (errors[index]?.[key]) {
      const newErrors = [...errors];
      const rowErrors = { ...newErrors[index] };
      delete rowErrors[key];
      newErrors[index] = rowErrors;
      setErrors(newErrors);
    }
  };

  const handleSave = async () => {
    const bank = draft[0];
    let bankErrors = {};
    let hasErrors = false;

    // Validation
    Object.keys(emptyBank).forEach((key) => {
      if (!["id", "is_active", "upi_id", "employee_id"].includes(key)) {
        if (!bank[key] || bank[key].toString().trim() === "") {
          bankErrors[key] = `${key.replace(/_/g, " ").toUpperCase()} IS REQUIRED`;
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      setErrors([bankErrors]);
      toast.error("Please fill all required fields");
      return;
    }

    try {
      // Determine Add or Update based on existence of ID
      if (bank.id) {
        await updateBank(emp_id, bank);
      } else {
        await addBank(emp_id, bank);
      }

      toast.success("Bank details saved successfully");
      setIsEditing(false);
      fetchBankDetails(true); // Silent re-fetch to update IDs/state
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save bank details");
    }
  };

  const handleCancel = () => {
    setDraft(JSON.parse(JSON.stringify(originalDraft))); // Deep copy to prevent reference issues
    setErrors([]);
    setIsEditing(false);
  };

  if (loading) return (
    <div className="py-20 flex flex-col items-center justify-center gap-4">
      <Loader />
      <p className="text-gray-400 animate-pulse text-sm">Retrieving secure bank data...</p>
    </div>
  );

  return (
    <div className="">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-gray-800 font-bold text-lg">Banking Information</h3>
      </div>

      {draft.map((bank, index) => (
        <div 
          key={bank.id || index} 
          className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5 w-full">
            {Object.keys(emptyBank).map((key) => {
              if (key === "id" || key === "is_active" || key === "employee_id") return null;

              return (
                <div key={key} className="flex flex-col space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                    {key.replace(/_/g, " ")}
                  </label>

                  <Input
                    label={null} 
                    value={bank[key] || ""}
                    disabled={!isEditing}
                    onChange={(e) => handleInputChange(index, key, e.target.value)}
                    placeholder={`Enter ${key.replace(/_/g, " ")}`}
                    className={`${
                      !isEditing 
                        ? "bg-gray-50 border-transparent text-gray-600 opacity-80 cursor-not-allowed" 
                        : "bg-white border-gray-300 focus:ring-2 focus:ring-blue-100"
                    } transition-all duration-200`}
                  />

                  {isEditing && errors[index]?.[key] && (
                    <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">
                      * {errors[index][key]}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {isEditing && (
        <div className="flex justify-end gap-3 mt-6 p-4 border-t border-gray-100">
          <button
            className="px-6 py-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="px-10 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
            onClick={handleSave}
          >
            Save Account Details
          </button>
        </div>
      )}
    </div>
  );
};

export default BankTab;