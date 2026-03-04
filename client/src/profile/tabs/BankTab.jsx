import React, { useContext, useEffect, useState, useCallback } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import { toast } from "react-hot-toast";
import { getBank, addBank, updateBank } from "../../../api/profile";
import { emptyBank } from "../../constants/emptyData";
import { AuthContext } from "../../context/AuthContextProvider";
import { useParams } from "react-router-dom";

const BankTab = ({ isEditing, setIsEditing,empId }) => {
  // const emp_id = JSON.parse(localStorage.getItem("user"))?.emp_id;

  const {emp_id} = useParams();

  const finalEmpId = emp_id || empId;


  const { token } = useContext(AuthContext);

  // Initialize as empty array to avoid ReferenceError
  const [draft, setDraft] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  // Memoized fetch function to reuse in useEffect and handleSave
  const fetchBank = useCallback(async () => {
    if (!finalEmpId) return;
    setLoading(true);
    try {
      const res = await getBank(finalEmpId);
      const bankData = res?.data?.bankDetails;

      if (bankData?.length > 0) {
        const mapped = bankData.map((b) => ({
          ...emptyBank,
          ...b,
        }));

        // console.log("mapped",mapped);

        setDraft(mapped);
      } else {
        setDraft([{ ...emptyBank }]);
      }
    } catch (error) {
      console.error("Failed to fetch bank details:", error);
      setDraft([{ ...emptyBank }]);
    } finally {
      setLoading(false);
    }
  }, [emp_id]);

  useEffect(() => {
    if (token) fetchBank();
  }, [fetchBank, token]);

  const handleSave = async () => {
    let hasErrors = false;
    const newErrors = [];

    // Validation
    draft.forEach((bank, index) => {
      const bankErrors = {};
      Object.keys(emptyBank).forEach((key) => {
        // Skip technical fields and optional UPI
        if (key !== "id" && key !== "is_active" && key !== "upi_id") {
          if (!bank[key] || bank[key].toString().trim() === "") {
            bankErrors[key] = "REQUIRED";
            hasErrors = true;
          }
        }
      });
      newErrors[index] = bankErrors;
    });

    if (hasErrors) {
      setErrors(newErrors);
      toast.error("Please fill all required fields");
      return;
    }

    try {
      for (const bank of draft) {
        if (bank.id) {
          await updateBank(emp_id, bank.id, bank);
        } else {
          await addBank(emp_id, bank);
        }
      }
      toast.success("Bank details saved successfully");
      setIsEditing(false);
      setErrors([]);
      fetchBank(); // Refresh data to sync IDs
    } catch (error) {
      toast.error("Failed to save bank details");
    }
  };

  const handleCancel = () => {
    fetchBank(); // Revert to database state
    setErrors([]);
    setIsEditing(false);
  };

  if (loading && draft.length === 0) {
    return (
      <div className="p-10 text-center text-gray-500">
        Loading bank details...
      </div>
    );
  }

  return (
    <div className="bg-white shadow p-1 rounded-lg">
      <form>
        {draft.map((bank, index) => (
          <div key={index} className="border rounded p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={bank.account_holder_name}
                  // onChange={(e) =>
                  //   handleChange(index, "account_holder_name", e.target.value)
                  // }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={bank.bank_name}
                  // onChange={(e) =>
                  //   handleChange(index, "bank_name", e.target.value)
                  // }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Account Number
                </label>
                <input
                  type="text"
                  value={bank.account_number}
                  // onChange={(e) =>
                  //   handleChange(index, "account_number", e.target.value)
                  // }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  IFSC Code
                </label>
                <input
                  type="text"
                  value={bank.ifsc_code}
                  // onChange={(e) =>
                  //   handleChange(index, "ifsc_code", e.target.value)
                  // }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Branch Name
                </label>
                <input
                  type="text"
                  value={bank.branch_name}
                  // onChange={(e) =>
                  //   handleChange(index, "branch_name", e.target.value)
                  // }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Account Type
                </label>
                <input
                  type="text"
                  value={bank.account_type}
                  // onChange={(e) =>
                  //   handleChange(index, "account_type", e.target.value)
                  // }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>
            </div>
          </div>
        ))}

        {isEditing && (
          <>
            {/* <div className="flex justify-start mb-4">
              <button
                type="button"
                onClick={handleAddRow}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm"
              >
                + Add Nominee
              </button>
            </div> */}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2 bg-[#222F7D] text-white rounded-lg text-sm"
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default BankTab;
