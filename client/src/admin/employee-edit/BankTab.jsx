import React, { useContext, useEffect, useState } from "react";
import FormCard from "../../components/FormCard";
import Input from "../../components/Input";
import { toast } from "react-hot-toast";
import { addBank, updateBank } from "../../../api/profile"; // Removed getBank since data comes via props
import { emptyBank } from "../../constants/emptyData";
import { AuthContext } from "../../context/AuthContextProvider";
import { useParams } from "react-router-dom";

const BankTab = ({ bankData, isEditing, cancelEdit,setIsEditing }) => {
    const { emp_id } = useParams();

   
  const { token } = useContext(AuthContext);

  // Initialize state with props data if available, otherwise use emptyBank
  const [draft, setDraft] = useState([{ ...emptyBank }]);
  const [originalDraft, setOriginalDraft] = useState([{ ...emptyBank }]);
  const [errors, setErrors] = useState([]);

  // Sync state with props when bankData changes (e.g., after parent fetches)
  useEffect(() => {
    if (bankData && bankData.length > 0) {
      const mapped = bankData.map((b) => ({
        ...emptyBank,
        ...b, // This spreads the actual values and the ID from the database
      }));
      setDraft(mapped);
      setOriginalDraft(mapped);
    }
  }, [bankData]);

  const handleInputChange = (index, key, value) => {
    const updatedDraft = [...draft];
    updatedDraft[index] = { ...updatedDraft[index], [key]: value };
    setDraft(updatedDraft);

    // Clear specific field error
    if (errors[index]?.[key]) {
      const newErrors = [...errors];
      const rowErrors = { ...newErrors[index] };
      delete rowErrors[key];
      newErrors[index] = rowErrors;
      setErrors(newErrors);
    }
  };

  const handleSave = async () => {
    // 1. Get the single bank object from the array
    const bank = draft[0]; 

    console.log("bank",bank)
  
    // 2. Standard Validation
    let bankErrors = {};
    let hasErrors = false;
    Object.keys(emptyBank).forEach((key) => {
      if (!["id", "is_active", "upi_id"].includes(key)) {
        if (!bank[key] || bank[key].toString().trim() === "") {
          bankErrors[key] = `${key.replace(/_/g, " ").toUpperCase()} IS REQUIRED`;
          hasErrors = true;
        }
      }
    });
  
    if (hasErrors) {
      setErrors([bankErrors]); // Keep as array to match mapping in UI
      toast.error("Please fill all required fields");
      return;
    }

  
    try {
      // 3. Single Record Logic
      // If the record exists (has an 'id' from the DB), update it. 
      // Otherwise, create it for this emp_id.
      if (bank.employee_id) {
        await updateBank(emp_id
            ,bank);
      } else {
        await addBank(emp_id, bank);
      }
  
      toast.success("Bank details updated successfully");
      setOriginalDraft([...draft]);
      setIsEditing(false);
      setErrors([]);
      if (cancelEdit) cancelEdit();
    } catch (error) {
      console.error("Save Error:", error);
      toast.error("Failed to save bank details");
    }
  };

  const handleCancel = ()=>{
    setDraft(originalDraft);
    setErrors([]);
    // cancelEdit();
    setIsEditing(false)
  }
  return (
    <div className="animate-in fade-in duration-500">
      {draft.map((bank, index) => (
        <FormCard key={bank.id || index}>
          {Object.keys(emptyBank).map((key) => {
            if (key === "id" || key === "is_active") return null;

            return (
              <div key={key} className="flex flex-col">
                <Input
                  label={key.replace(/_/g, " ").toUpperCase()}
                  value={bank[key] || ""}
                  disabled={!isEditing}
                  onChange={(e) => handleInputChange(index, key, e.target.value)}
                />
                {isEditing && errors[index]?.[key] && (
                  <p className="text-red-500 text-[10px] font-bold mt-1">
                    * {errors[index][key]}
                  </p>
                )}
              </div>
            );
          })}
        </FormCard>
      ))}

      {isEditing && (
        <div className="flex justify-end gap-3 mt-4 p-4 border-t bg-gray-50 rounded-b-xl">
          <button
            className="px-4 py-2 text-sm font-semibold text-gray-500 hover:text-gray-700"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 transition-all"
            onClick={handleSave}
          >
            Save 
          </button>
        </div>
      )}
    </div>
  );
};

export default BankTab;