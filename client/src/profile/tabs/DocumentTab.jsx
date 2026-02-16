import React, { useContext, useRef, useState, useEffect } from "react";
import FormCard from "../../components/FormCard";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";
import api from "../../../api/axiosInstance";

const DOCUMENTS = [
  { key: "aadhaar", label: "Aadhaar Document" },
  { key: "pan", label: "PAN Document" },
  { key: "passbook", label: "Bank Passbook" },
  { key: "address_proof", label: "Address Proof" },
];

const DocumentTab = ({ isEditing,setIsEditing }) => {
  const [files, setFiles] = useState({});
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const { token } = useContext(AuthContext);

  const refs = {
    aadhaar: useRef(null),
    pan: useRef(null),
    passbook: useRef(null),
    address_proof: useRef(null),
  };

  const emp_id = JSON.parse(localStorage.getItem("user"))?.emp_id;

  // --- 1. Fetch & Map Array Logic ---
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/employee/profile/bank/doc/${emp_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Backend returns: { documents: [ {file_type: 'aadhaar', file_path: '...'}, ... ] }
        const docArray = res.data.documents || [];
        const fetchedPreviews = {};

        // Get Backend Base URL (e.g., http://localhost:5000)
        const BASE_URL = api.defaults.baseURL.split('/api')[0];

        DOCUMENTS.forEach((doc) => {
          const foundDoc = docArray.find((item) => item.file_type === doc.key);

          if (foundDoc) {
            // Clean URL: Combine and fix double slashes except after http:
            const cleanUrl = `${BASE_URL}${foundDoc.file_path}`.replace(/([^:]\/)\/+/g, "$1");
            
            fetchedPreviews[doc.key] = {
              url: cleanUrl,
              type: foundDoc.file_path.toLowerCase().endsWith(".pdf") 
                ? "application/pdf" 
                : "image/jpeg",
            };
          }
        });

        setPreviews(fetchedPreviews);
      } catch (err) {
        console.error("Fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    if (emp_id) fetchDocs();
    
    // Cleanup temporary URLs on unmount
    return () => {
      Object.values(previews).forEach(p => {
        if (p.url && p.url.startsWith('blob:')) URL.revokeObjectURL(p.url);
      });
    };
  }, [emp_id, token]);

  const handleFileChange = (e, key) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Please upload JPG or PDF.");
      return;
    }

    // Revoke old blob URL if replacing a file to save memory
    if (previews[key]?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(previews[key].url);
    }

    setFiles((prev) => ({ ...prev, [key]: file }));
    setPreviews((prev) => ({
      ...prev,
      [key]: {
        url: URL.createObjectURL(file),
        type: file.type,
      },
    }));
  };

  const handleSaveDocuments = async () => {
    try {
      const fd = new FormData();
      Object.entries(files).forEach(([key, file]) => {
        if (file) fd.append(key, file);
      });

      if ([...fd.keys()].length === 0) {
        toast.error("No changes to save");
        return;
      }

      await api.post(`employee/profile/bank/doc/${emp_id}`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Documents uploaded successfully");
      setIsEditing(false);
      // Trigger a page refresh or call a parent refresh function here if available
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload documents");
    }
  };

  const renderPreview = (preview, label) => {
    if (loading) return <div className="w-24 h-24 bg-gray-100 animate-pulse rounded" />;
    
    if (!preview || !preview.url) {
      return (
        <div className="w-24 h-24 border-2 border-dashed border-gray-200 rounded flex items-center justify-center bg-gray-50 text-gray-400 text-[10px] text-center p-2">
          Not Uploaded
        </div>
      );
    }

    const isPDF = preview.type === "application/pdf" || preview.url.toLowerCase().endsWith('.pdf');

    return (
      <div className="w-24 h-24 border rounded flex flex-col items-center justify-center overflow-hidden bg-white shadow-sm transition-all hover:border-blue-300 group relative">
        {isPDF ? (
          <div className="flex flex-col items-center gap-1">
            <span className="text-red-500 font-bold text-xs uppercase">PDF</span>
            <a
              href={preview.url}
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 text-[10px] font-medium underline hover:text-blue-800"
            >
              View File
            </a>
          </div>
        ) : (
          <img
            src={preview.url}
            alt={label}
            className="w-full h-full object-cover cursor-zoom-in"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/100?text=Error";
            }}
            onClick={() => window.open(preview.url, "_blank")}
          />
        )}
      </div>
    );
  };

  const handleCancel = ()=>{
    setIsEditing(false);
  }

  return (
    <>
      <FormCard title="KYC & Bank Documents">
        {DOCUMENTS.map((doc) => (
          <div key={doc.key} className="flex items-center gap-4 mt-6 pb-4 border-b last:border-0">
            <div className="flex-1">
              <label className="block mb-2 text-sm font-semibold text-gray-700">
                {doc.label}
              </label>
              {isEditing ? (
                <div className="space-y-1">
                  <input
                    type="file"
                    name={doc.key}
                    ref={refs[doc.key]}
                    accept=".jpg,.jpeg,.pdf"
                    onChange={(e) => handleFileChange(e, doc.key)}
                    className="block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                  />
                  <p className="text-[10px] text-gray-400">JPG, JPEG or PDF (Max 5MB)</p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">
                  {previews[doc.key] ? "Document uploaded" : "No document provided"}
                </p>
              )}
            </div>

            <div className="flex-shrink-0">
              {renderPreview(previews[doc.key], doc.label)}
            </div>
          </div>
        ))}
      </FormCard>

      {isEditing && (
        <div className="flex justify-end gap-3 mt-4">
          <button
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
            onClick={handleSaveDocuments}
          >
            Save Changes
          </button>
        </div>
      )}
    </>
  );
};

export default DocumentTab;