import React, { useContext, useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";
import { FaCloudUploadAlt, FaEye, FaFilePdf } from "react-icons/fa";
import { uploadBankDoc, getBankDocs } from "../../../api/profile";

const DOCUMENTS = [
  { file_type: "aadhaar", label: "Aadhaar Document" },
  { file_type: "pan", label: "PAN Document" },
  { file_type: "passbook", label: "Bank Passbook" },
  { file_type: "address_proof", label: "Address Proof" },
];

const SERVER_URL = "http://localhost:5000";

const DocumentTab = ({ isEditing, setIsEditing, empId }) => {
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [savedDocs, setSavedDocs] = useState([]); // Changed to array to match your API response
  const [loading, setLoading] = useState(false);

  const loadDocuments = useCallback(async () => {
    if (!empId) return;
    try {
      setLoading(true);
      const res = await getBankDocs(empId);
      // Store the entire documents array
      setSavedDocs(res.data?.documents || []);
    } catch (err) {
      console.error("Fetch Error:", err);
      if (err.response?.status !== 404) {
        toast.error("Could not load existing documents");
      }
    } finally {
      setLoading(false);
    }
  }, [empId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  useEffect(() => {
    return () => {
      Object.values(previews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previews]);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      return toast.error("File size should be less than 2MB");
    }

    setFiles((prev) => ({ ...prev, [key]: file }));
    setPreviews((prev) => ({ ...prev, [key]: URL.createObjectURL(file) }));
  };

  const handleSaveDocuments = async () => {
    const fd = new FormData();
    Object.entries(files).forEach(([key, file]) => {
      if (file) fd.append(key, file);
    });

    if ([...fd.keys()].length === 0) {
      return toast.error("Please upload at least one document");
    }

    try {
      await uploadBankDoc(empId, fd);
      toast.success("Documents uploaded successfully");
      setIsEditing(false);
      setFiles({});
      setPreviews({});
      loadDocuments();
    } catch (err) {
      toast.error("Failed to upload documents");
    }
  };

  const handleCancel = () => {
    setFiles({});
    setPreviews({});
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Form Section (Edit Mode) */}
      <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isEditing ? "opacity-100 mb-8 max-h-[1000px]" : "opacity-0 max-h-0"}`}>
        <div className="flex justify-between items-center mb-3 text-blue-700 font-bold uppercase text-xs tracking-wider">
          <h3>Upload Documents</h3>
        </div>

        <div className="w-full border rounded-xl p-6 bg-white shadow-sm border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {DOCUMENTS.map((doc) => {
              const preview = previews[doc.file_type];
              const file = files[doc.file_type];
              const isPdf = file?.type === "application/pdf";

              return (
                <div key={doc.file_type} className="flex flex-col group">
                  <label className="text-[11px] font-bold text-gray-500 mb-1.5 uppercase">{doc.label}</label>
                  <div className="flex items-center gap-3">
                  <div className="relative flex-1">
  <input 
    type="file" 
    id={`file-${doc.file_type}`} 
    className="hidden" 
    accept="image/*,.pdf" 
    onChange={(e) => handleFileChange(e, doc.file_type)} 
  />
  <label 
    htmlFor={`file-${doc.file_type}`} 
    className="flex flex-col items-center justify-center gap-1 w-full px-4 py-2.5 rounded-lg border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition-all text-gray-600"
  >
    <div className="flex items-center gap-2">
      <FaCloudUploadAlt className="text-lg text-blue-500" />
      <span className="text-sm">
        {file ? file.name.slice(0, 15) + "..." : "Choose File"}
      </span>
    </div>
    {/* Format Hint Message */}
    {!file && (
      <span className="text-[9px] text-gray-400 uppercase tracking-tight">
        Only JPG, PNG or PDF (Max 2MB)
      </span>
    )}
  </label>
</div>

                    {preview && (
                      <div className="w-11 h-11 rounded-lg border overflow-hidden bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {isPdf ? <FaFilePdf className="text-red-500 text-xl" /> : <img src={preview} className="w-full h-full object-cover" alt="prev" />}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end gap-3 mt-6 border-t pt-5">
            <button className="px-6 py-2 text-sm bg-gray-50 rounded-lg" onClick={handleCancel}>Cancel</button>
            <button className="px-8 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg shadow-lg" onClick={handleSaveDocuments}>Save Changes</button>
          </div>
        </div>
      </div>

      {/* 2. Display Section (Saved Docs) */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-gray-700 font-bold">Identity Documents</h2>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md">
              Edit Documents
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {DOCUMENTS.map((doc) => {
            const docData = Array.isArray(savedDocs) 
              ? savedDocs.find((item) => item.file_type === doc.file_type) 
              : null;
            
            const filePath = docData?.file_path;
            const isPdf = filePath?.toLowerCase().endsWith(".pdf");

            return (
              <div key={doc.file_type} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center gap-3">
                <div className="w-full h-32 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden relative group">
                  {loading ? (
                    <div className="animate-pulse w-full h-full bg-gray-200" />
                  ) : filePath ? (
                    <>
                      {isPdf ? (
                        <FaFilePdf size={40} className="text-red-500" />
                      ) : (
                        <img 
                          src={`${SERVER_URL}${filePath}`} 
                          alt={doc.label} 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      <a 
                        href={`${SERVER_URL}${filePath}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      >
                        <FaEye className="text-white text-xl" />
                      </a>
                    </>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-gray-300">Not Uploaded</span>
                  )}
                </div>
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">{doc.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DocumentTab;