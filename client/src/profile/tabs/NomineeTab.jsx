import React, { useEffect, useState } from "react";
import { emptyNominee } from "../../constants/emptyData";

export const NomineeTab = ({ isEditing, empId }) => {
  const [nomineeData, setNomineeData] = useState(emptyNominee);

  const getNomineeData = async () => {
    try {
      // Example API call
      // const res = await api.get(`/api/nominee/${empId}`);
      // setNomineeData(res.data);

      if (!nomineeData || nomineeData.length === 0) {
        setNomineeData(emptyNominee);
      }
    } catch (error) {
      console.error("Error fetching nominee data:", error);
    }
  };

  useEffect(() => {
    getNomineeData();
  }, [empId]);

  const handleChange = (index, field, value) => {
    const updated = [...nomineeData];
    updated[index][field] = value;
    setNomineeData(updated);
  };

  const handleAddRow = () => {
    setNomineeData([
      ...nomineeData,
      {
        nomineeName: "",
        nomineeRelation: "",
        nomineeContact: "",
      },
    ]);
  };

  const handleCancel = () => {
    setNomineeData(emptyNominee);
  };

  const handleSave = () => {
    console.log("Saving:", nomineeData);
    // Call API here
  };

  return (
    <div className="bg-white shadow p-4 rounded-lg">
      <form>
        {nomineeData.map((nominee, index) => (
          <div key={index} className="border rounded p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Nominee Name
                </label>
                <input
                  type="text"
                  value={nominee.nomineeName}
                  onChange={(e) =>
                    handleChange(index, "nomineeName", e.target.value)
                  }
                  disabled={!isEditing}
                 className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Nominee Relation
                </label>
                <input
                  type="text"
                  value={nominee.nomineeRelation}
                  onChange={(e) =>
                    handleChange(index, "nomineeRelation", e.target.value)
                  }
                  disabled={!isEditing}
                  className={`border rounded px-3 py-2 text-sm transition-all duration-200 bg-gray-200 text-gray-600 border-gray-300 focus:outline-none focus:ring-2 ${isEditing ? "" : "cursor-not-allowed"}`}
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-gray-600 mb-1 font-medium">
                  Nominee Contact
                </label>
                <input
                  type="text"
                  value={nominee.nomineeContact}
                  onChange={(e) =>
                    handleChange(index, "nomineeContact", e.target.value)
                  }
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

export default NomineeTab;
