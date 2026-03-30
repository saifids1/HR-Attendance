// /* eslint-disable react-hooks/set-state-in-effect */
// import React, { useEffect, useState } from "react";
// import { emptyNominee } from "../../constants/emptyData";
// import { addNominee, getNominee, updateNominee } from "../../../api/profile";
// import { useParams } from "react-router-dom";
// import { toast } from "react-hot-toast";


// export const NomineeTab = ({ nomineData, isEditing, empId, setIsEditing }) => {
//   const [nomineeData, setNomineeData] = useState(emptyNominee);
//   const { emp_id } = useParams()

//   const finalEmpId = emp_id || empId;


//   useEffect(() => {
//     if (nomineData && Object.keys(nomineData).length > 0) {
//       setNomineeData(nomineData);
//     } else {
//       setNomineeData(emptyNominee);
//     }
//   }, [nomineData]);

//   // useEffect(()=>{
//   //   console.log("url id ", emp_id)
//   // },[emp_id])

// useEffect(() => {
//   if (!finalEmpId) return;

//   const fetchNominee = async () => {
//     try {
//       const resp = await getNominee(finalEmpId);

//       setNomineeData(
//         resp?.data?.nominee || emptyNominee
//       );
//     } catch (error) {
//       console.log(error);
//       setNomineeData(emptyNominee);
//     }
//   };

//   fetchNominee();
// }, [finalEmpId]);

//   // console.log("nomineeData",nomineeData)



//   const handleChange = (field, value) => {
//     setNomineeData(prev => ({
//       ...prev,
//       [field]: value
//     }));
//   };

//   // const handleAddRow = async() => {

//   //   setNomineData([
//   //     ...nomineeData,
//   //     {
//   //       nomineeName: "",
//   //       nomineeRelation: "",
//   //       nomineeContact: "",
//   //     },
//   //   ]);
//   // };

//   const handleCancel = () => {
//     setIsEditing(false);
//     // setNomineeData(emptyNominee);
//   };

//   const handleSave = async () => {
//     try {
//       if (!finalEmpId) return;

//       const resp = nomineeData.id
//         ? await updateNominee(finalEmpId, nomineeData.id, nomineeData)
//         : await addNominee(finalEmpId, nomineeData);

//       console.log("reps save", resp.data.data);
//       setNomineeData(prev => ({
//         ...prev,
//         ...resp.data.data
//       }));

//       setIsEditing(false);

//       toast.success("Nominee Updated Sucessfully")


//     } catch (error) {
//       console.error(error);
//     }
//   };
//   // useEffect(()=>{

//   //   console.log("nomineeData",nomineData);
//   // },[nomineData])



//   return (
//     // <div className="bg-white shadow p-4 rounded-lg">
//     //   <form>
//     //     <div className="border rounded p-4 mb-4">
//     //       <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
//     //         {/* {nomineData?.map((nominee,index)=>( */}
//     //         <>
//     //           <div className="flex flex-col">
//     //             <label className="text-sm text-gray-600 mb-1 font-medium">
//     //               Nominee Name
//     //             </label>
//     //             <input
//     //               type="text"
//     //               placeholder="Enter Nominee Name"
//     //               value={nomineeData?.nominee_name || ""}
//     //               onChange={(e) =>
//     //                 handleChange("nominee_name", e.target.value)
//     //               }
//     //               disabled={!isEditing}
//     //               className="border rounded px-3 py-2 text-sm"
//     //             />
//     //           </div>

//     //           <div className="flex flex-col">
//     //             <label className="text-sm text-gray-600 mb-1 font-medium">
//     //               Nominee Relation
//     //             </label>
//     //             <input
//     //               type="text"
//     //               placeholder="Enter Nominee Relation"
//     //               value={nomineeData?.nominee_relation || ""}
//     //               onChange={(e) =>
//     //                 handleChange("nominee_relation", e.target.value)
//     //               }
//     //               disabled={!isEditing}
//     //               className="border rounded px-3 py-2 text-sm"
//     //             />
//     //           </div>

//     //           <div className="flex flex-col">
//     //             <label className="text-sm text-gray-600 mb-1 font-medium">
//     //               Nominee Contact
//     //             </label>
//     //             <input
//     //               type="text"
//     //               placeholder="Enter Nominee Contact"
//     //               value={nomineeData?.nominee_contact || ""}
//     //               onChange={(e) =>
//     //                 handleChange("nominee_contact", e.target.value)
//     //               }
//     //               disabled={!isEditing}
//     //               className="border rounded px-3 py-2 text-sm"
//     //             />
//     //           </div>

//     //           <table>
//     //             <thead>
//     //               <th>
//     //                 <td>Nominee Name</td>
//     //                 <td>Nominee Relation</td>
//     //                 <td>Nominee Percentage</td>
//     //                 <td>Nominee Contact</td>
//     //               </th>
//     //             </thead>
//     //             <tbody>
//     //               <tr>
//     //                 <td>Dummy</td>
//     //                 <td>
//     //                   <select
//     //       className="w-full border px-2 py-1 text-sm rounded"
//     //       // value={draft.contact_type || ""}
//     //       // onChange={(e) => onChange("contact_type", e.target.value)}
//     //     >
//     //       {/* {contactTypeOptions.map((type) => (
//     //         <option key={type} value={type}>
//     //           {type}
//     //         </option>
//     //       ))} */}
//     //       <option value="">Wife</option>
//     //       <option value="">Husband</option>
//     //       <option value="">Sister</option>
//     //       <option value="">Brother</option>
//     //        <option value="">Father</option>
//     //         <option value="">Mother</option>
//     //            <option value="">Son</option>
//     //         <option value="">Daughter</option>
//     //     </select>
//     //                 </td>
//     //                 <td></td>
//     //                 <td></td>
//     //               </tr>
//     //             </tbody>
//     //           </table>
//     //         </>
//     //         {/* ))} */}


//     //       </div>
//     //     </div>


//     //     {isEditing && (
//     //       <>
//     //         {/* <div className="flex justify-start mb-4">
//     //           <button
//     //             type="button"
//     //             onClick={handleAddRow}
//     //             className="px-4 py-2 bg-green-600 text-white rounded-md text-sm"
//     //           >
//     //             + Add Nominee
//     //           </button>
//     //         </div> */}

//     //         <div className="flex justify-end gap-3">
//     //           <button
//     //             type="button"
//     //             onClick={handleCancel}
//     //             className="px-6 py-2 bg-gray-200 rounded-lg text-sm"
//     //           >
//     //             Cancel
//     //           </button>

//     //           <button
//     //             type="button"
//     //             onClick={handleSave}
//     //             className="px-6 py-2 bg-[#222F7D] text-white rounded-lg text-sm"
//     //           >
//     //             Save Changes
//     //           </button>
//     //         </div>
//     //       </>
//     //     )}
//     //   </form>
//     // </div>

//      <div className="container-fluid">
//           <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
//             <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
//               <table className="min-w-full divide-y divide-gray-300">
//                 <thead className="bg-gray-200">
//                   <tr>
//                     <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
//                       Nominee Name
//                     </th>
//                     <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
//                        Nominee Relation
//                     </th>
//                     <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
//                        Nominee Contact
//                     </th>
//                     <th className="px-4 py-2 text-left text-sm text-gray-600 mb-1 font-medium">
//                       Nominee Percentage
//                     </th>
                  
//                     <th className="px-4 py-2 text-center text-sm text-gray-600 mb-1 font-medium">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
    
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {/* {rows.map((contact, index) =>
//                     editingIndex === index ? (
//                       <EditableRow
//                         key={contact.id || "new"}
//                         draft={draft}
//                         onChange={handleChange}
//                         onSave={handleSave}
//                         onCancel={handleCancel}
//                       />
//                     ) : (
//                       <tr key={contact.id || index}>
//                         <td className="px-4 py-2 text-sm text-gray-600">
//                           {contact.contact_type}
//                         </td>
//                         <td className="px-4 py-2 text-sm text-gray-600">{contact.phone}</td>
//                         <td className="px-4 py-2 text-sm text-gray-600">{contact.email}</td>
//                         <td className="px-4 py-2 text-sm text-gray-600">{contact.relation}</td>
//                         <td className="px-4 py-2 text-center text-sm text-gray-600">
//                           {contact.is_primary ? "Yes" : "No"}
//                         </td>
//                         <td className="px-4 py-2 text-sm text-center text-gray-600">
//                           <div className="flex gap-4 justify-center">
//                             <button
//                               // onClick={() => handleEdit(contact, index)}
//                               className="text-blue-500 hover:text-blue-700"
//                             >
//                               {/* {draft && draft.id === contact.id ? (
//                                 <FaCheck />
//                               ) : (
//                                 <FaPencilAlt />
//                               )} */}
//                             {/* </button>
    
//                             <button
//                               // onClick={() => handleDelete(contact.id)}
//                               className="text-red-500 hover:text-red-700"
//                             >
//                               <MdDelete size={18} />
//                             </button>
//                           </div>
//                         </td>
//                       </tr>
//                     ),
//                   // )} */} 
//                   {/* {rows.length === 0 && !isAddingNew && (
//                     <tr>
//                       <td colSpan="6" className="text-center py-6 text-gray-400 text-sm">
//                         No contact information available
//                       </td>
//                     </tr>
//                   )} */}
//                   {/* {isAddingNew && draft && !draft.id && (
//                     <EditableRow
//                       draft={draft}
//                       onChange={handleChange}
//                       onSave={handleSave}
//                       onCancel={handleCancel}
//                     />
//                   )} */}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </div>
//   );
// };

// const EditableRow = ({ draft, onChange, onSave, onCancel }) => {
//   if (!draft) return null;

//   return (
//     <tr className="bg-blue-50/30">
//       <td className="p-2 text-sm text-gray-600">
//         <select
//           className="w-full border px-2 py-1 text-sm rounded"
//           value={draft.contact_type || ""}
//           onChange={(e) => onChange("contact_type", e.target.value)}
//         >
//           {contactTypeOptions.map((type) => (
//             <option key={type} value={type}>
//               {type}
//             </option>
//           ))}
//         </select>
//       </td>

//       <td className="p-2 text-sm text-gray-600">
//         <input
//           className="w-full border px-2 py-1 text-sm rounded"
//           value={draft.phone || ""}
//           onChange={(e) => onChange("phone", e.target.value)}
//         />
//       </td>

//       <td className="p-2 text-sm text-gray-600">
//         <input
//           className="w-full border px-2 py-1 text-sm rounded"
//           value={draft.email || ""}
//           onChange={(e) => onChange("email", e.target.value)}
//         />
//       </td>

//       <td className="p-2 text-sm text-gray-600">
//         <input
//           className="w-full border px-2 py-1 text-sm rounded"
//           value={draft.relation || ""}
//           onChange={(e) => onChange("relation", e.target.value)}
//         />
//       </td>

//       <td className="p-2 text-center text-sm text-gray-600">
//         <input
//           type="checkbox"
//           checked={draft.is_primary || false}
//           onChange={(e) => onChange("is_primary", e.target.checked)}
//         />
//       </td>

//       <td className="p-2 text-sm text-gray-600">
//         <div className="flex gap-4 items-center justify-center">
//           <button
//             onClick={onSave}
//             className="text-green-600 hover:text-green-800"
//           >
//             <FaCheck size={16} />
//           </button>
//           <button
//             onClick={onCancel}
//             className="text-orange-500 hover:text-orange-700"
//           >
//             <FaTimes size={16} />
//           </button>
//         </div>
//       </td>
//     </tr>
//   );
// };

// export default NomineeTab;



/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from "react";
import { getNominee, addNominee, updateNominee } from "../../../api/profile";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { FaCheck, FaTimes, FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import api from "../../../api/axiosInstance";

const BLANK_NOMINEE = {
  nominee_name: "",
  nominee_relation: "",
  nominee_contact: "",
  nominee_percentage: "",
};

export const NomineeTab = ({ empId, isEditing, setIsEditing, isAddingNew, setIsAddingNew }) => {
  const [nomineeData, setNomineeData] = useState([]); // Initialize as array to match contact table logic
  const [editingIndex, setEditingIndex] = useState(null);
  const [draft, setDraft] = useState(null);
  const { emp_id } = useParams();
  const finalEmpId = emp_id || empId;

  const fetchNominee = async () => {
    if (!finalEmpId) return;
    try {
      const resp = await getNominee(finalEmpId);
      const data = resp?.data?.nominee;
      // Ensure state is always an array for .map()
      console.log("Fetched nominee data:", data);
      setNomineeData(Array.isArray(data) ? data : data ? [data] : []);
    } catch (error) {
      console.error("Fetch Error:", error);
      setNomineeData([]);
    }
  };

  useEffect(() => {
    fetchNominee();
  }, [finalEmpId]);

  // Handle the "Add New" trigger from Parent
  useEffect(() => {
    if (isAddingNew) {
      setDraft({ ...BLANK_NOMINEE });
      setEditingIndex(null); // Ensure we aren't editing an existing row
    } else {
      setDraft(null);
    }
  }, [isAddingNew]);

  const handleEdit = (nominee, index) => {
    setEditingIndex(index);
    setDraft({ ...nominee });
    setIsEditing(true);
  };

  const handleChange = (field, value) => {
  if (field === "nominee_contact") {
    // Only allow digits and max length of 10
    if (!/^\d*$/.test(value) || value.length > 10) return;
  }
  
  if (field === "nominee_percentage") {
    // Prevent percentages over 100 or negative numbers
    if (value > 100 || value < 0) return;
  }

  setDraft((prev) => ({
    ...prev,
    [field]: value,
  }));
};

  const handleCancel = () => {
    setIsEditing(false);
    setIsAddingNew(false);
    setEditingIndex(null);
    setDraft(null);
  };

const handleSave = async () => {
  if (!finalEmpId || !draft) return;

  // --- Front-end Validations ---
  if (!draft.nominee_name || !draft.nominee_relation || !draft.nominee_contact || !draft.nominee_percentage) {
    return toast.error("All fields are required");
  }

  if (draft.nominee_contact.length !== 10) {
    return toast.error("Contact number must be exactly 10 digits");
  }

  const pct = Number(draft.nominee_percentage);
  if (pct <= 0 || pct > 100) {
    return toast.error("Percentage must be between 1 and 100");
  }

  try {
    let resp;
    if (draft.id) {
      // UPDATE existing
      resp = await updateNominee(finalEmpId, draft.id, draft);
    } else {
      // CREATE new: Backend requires array format
      const payload = {
        nominees: [draft]
      };
      resp = await addNominee(finalEmpId, payload);
    }

    toast.success("Nominee saved successfully");
    setIsEditing(false);
    setIsAddingNew(false);
    setEditingIndex(null);
    setDraft(null);
    fetchNominee(); 
  } catch (error) {
    console.error("Save Error:", error);
    // This will display the "Total percentage exceeded" error from your backend
    toast.error(error.response?.data?.message || "Error saving nominee");
  }
};

  const handleDelete = async (id) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this nominee?")) return;

    try {
      await api.delete(`/employee/profile/nominee/${finalEmpId}/${id}`);
      toast.success("Nominee deleted successfully");
      fetchNominee();
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="container-fluid">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nominee Name</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Relation</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Percentage</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* 1. Existing Rows */}
              {nomineeData.map((nominee, index) =>
                editingIndex === index ? (
                  <EditableRow
                    key={nominee.id || index}
                    draft={draft}
                    onChange={handleChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                ) : (
                  <tr key={nominee.id || index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{nominee.nominee_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{nominee.nominee_relation}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{nominee.nominee_contact}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{nominee.nominee_percentage}%</td>
                    <td className="px-4 py-3 text-center text-sm">
                      <div className="flex justify-center gap-3">
                        <button 
                          onClick={() => handleEdit(nominee, index)} 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FaPencilAlt size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(nominee.id)} 
                          className="text-red-500 hover:text-red-700"
                        >
                          <MdDelete size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {/* 2. Add New Row (Always at the bottom) */}
              {isAddingNew && draft && !draft.id && (
                <EditableRow
                  draft={draft}
                  onChange={handleChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                />
              )}

              {/* 3. Empty State */}
              {nomineeData.length === 0 && !isAddingNew && (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-sm text-gray-400 italic">
                    No nominee information found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const EditableRow = ({ draft, onChange, onSave, onCancel }) => {
  const relations = ["Wife", "Husband", "Father", "Mother", "Son", "Daughter", "Brother", "Sister"];
  return (
    <tr className="bg-blue-50/50">
      <td className="p-2">
        <input 
          className="w-full border border-blue-200 p-1 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" 
          value={draft?.nominee_name || ""} 
          onChange={(e) => onChange("nominee_name", e.target.value)} 
          placeholder="Name"
        />
      </td>
      <td className="p-2">
        <select 
          className="w-full border border-blue-200 p-1 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" 
          value={draft?.nominee_relation || ""} 
          onChange={(e) => onChange("nominee_relation", e.target.value)}
        >
          <option value="">Select</option>
          {relations.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </td>
      <td className="p-2">
        <input 
          className="w-full border border-blue-200 p-1 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" 
          value={draft?.nominee_contact || ""} 
          onChange={(e) => onChange("nominee_contact", e.target.value)} 
          placeholder="Phone"
        />
      </td>
      <td className="p-2">
        <input 
          type="number" 
          className="w-full border border-blue-200 p-1 rounded text-sm focus:ring-1 focus:ring-blue-400 outline-none" 
          value={draft?.nominee_percentage || ""} 
          onChange={(e) => onChange("nominee_percentage", e.target.value)} 
          placeholder="%"
        />
      </td>
      <td className="p-2 text-center">
        <div className="flex gap-3 justify-center">
          <button onClick={onSave} className="text-green-600 hover:text-green-800">
            <FaCheck size={16} />
          </button>
          <button onClick={onCancel} className="text-red-500 hover:text-red-700">
            <FaTimes size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default NomineeTab;
