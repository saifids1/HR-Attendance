import React, { useContext, useRef, useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { AuthContext } from "../../context/AuthContextProvider";
import api from "../../../api/axiosInstance";
import { FaPencilAlt, FaCheck, FaTimes, FaFileAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";

const documentTypes = [
  "Passport Size Photo",
  "Aadhar Card",
  "PAN Card",
  "Bank PassBook",
  "Passport",
  "Updated CV",
  "UAN Card",
];

const emptyDocument = {
  documentType: "Aadhar Card",
  documentNumber: "1234567",
  file: null,
};

const DocumentTab = ({
  isEditing,
  setIsEditing,
  setIsAddingNew,
  isAddingNew,
}) => {
  const { token } = useContext(AuthContext);
  const emp_id = JSON.parse(localStorage.getItem("user"))?.emp_id;

  const [documents, setDocuments] = useState([]);
  const [draft, setDraft] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const fileRef = useRef(null);

  /* ================= FETCH DOCUMENTS ================= */

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get(`/employee/profile/bank/doc/${emp_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const BASE_URL = api.defaults.baseURL.split("/api")[0];

        const formatted =
          res.data.documents?.map((doc) => ({
            ...doc,
            fullUrl: `${BASE_URL}${doc.file_path}`.replace(
              /([^:]\/)\/+/g,
              "$1"
            ),
            fileName: doc.file_path.split("/").pop(),
          })) || [];

        setDocuments(formatted);
      } catch (err) {
        console.error(err);
      }
    };

    if (emp_id) fetchDocs();
  }, [emp_id, token]);

  /* ================= SHOW DRAFT IF EMPTY ================= */

  useEffect(() => {
    if (documents.length === 0) {
      setDraft({ ...emptyDocument });
      setEditingIndex("new"); // show as normal row first
    }
  }, [documents]);

useEffect(() => {
  if (isAddingNew) {
    setDraft({ ...emptyDocument });
    setEditingIndex("new-edit"); // directly editable row
  }
}, [isAddingNew]);
  /* ================= EDIT EXISTING ================= */

  const handleEdit = (doc, index) => {
    if (draft && editingIndex !== null) {
      toast.error("Please save or cancel current changes first");
      return;
    }

    setEditingIndex(index);
    setDraft({
      documentType: doc.file_type,
      documentNumber: doc.document_no || "",
      file: null,
      id: doc.id,
    });

    setIsEditing(true);
  };

  /* ================= FILE CHANGE ================= */

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDraft((prev) => ({
      ...prev,
      file,
    }));
  };

  /* ================= SAVE ================= */

  const handleSave = async () => {
    if (!draft) return;

    try {
      const fd = new FormData();

      fd.append("documentType", draft.documentType);
      fd.append("documentNumber", draft.documentNumber);

      if (draft.file) {
        fd.append("file", draft.file);
      }

      await api.post(`/employee/profile/bank/doc/${emp_id}`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Document saved");

      setDraft(null);
      setEditingIndex(null);
      setIsAddingNew(false);
      setIsEditing(false);

      // Refresh list
      const res = await api.get(`/employee/profile/bank/doc/${emp_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const BASE_URL = api.defaults.baseURL.split("/api")[0];

      const formatted =
        res.data.documents?.map((doc) => ({
          ...doc,
          fullUrl: `${BASE_URL}${doc.file_path}`.replace(
            /([^:]\/)\/+/g,
            "$1"
          ),
          fileName: doc.file_path.split("/").pop(),
        })) || [];

      setDocuments(formatted);
    } catch (err) {
      toast.error("Save failed");
    }
  };

  /* ================= DELETE ================= */

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this document?")) return;

    try {
      await api.delete(`/employee/profile/bank/doc/${emp_id}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("Deleted");
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch {
      toast.error("Delete failed");
    }
  };

  /* ================= CANCEL ================= */

  const handleCancel = () => {
    if (editingIndex === "new-edit") {
      setEditingIndex("new"); // go back to draft view
    } else {
      setDraft(null);
      setEditingIndex(null);
    }

    setIsAddingNew(false);
    setIsEditing(false);
  };

  /* ================= UI ================= */

  return (
    <div className="container-fluid">
      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 rounded-lg">
          <table className="min-w-full divide-y divide-gray-300">
            <thead className="bg-gray-200">
              <tr>
                <th className="px-4 py-2 font-bold text-gray-700 text-left">
                  Document type
                </th>
                <th className="px-4 py-2 font-bold text-gray-700 text-left">
                  Document No.
                </th>
                <th className="px-4 py-2 font-bold text-gray-700 text-left">
                  Document
                </th>
                <th className="px-4 py-2 font-bold text-gray-700 text-center">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc, index) =>
                editingIndex === index ? (
                  <EditableRow
                    key={doc.id}
                    draft={draft}
                    setDraft={setDraft}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    fileRef={fileRef}
                    handleFileChange={handleFileChange}
                  />
                ) : (
                  <tr key={doc.id}>
                    <td className="px-4 py-2 text-sm">{doc.file_type}</td>
                    <td className="px-4 py-2 text-sm">
                      {doc.document_no || "-"}
                    </td>
                    <td className="px-4 py-2 text-sm text-blue-600 underline cursor-pointer">
                      <span onClick={() => window.open(doc.fullUrl, "_blank")}>
                        {doc.fileName}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-center">
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => handleEdit(doc, index)}
                          className="text-blue-500"
                        >
                          <FaPencilAlt />
                        </button>

                        <button
                          onClick={() => handleDelete(doc.id)}
                          className="text-red-500"
                        >
                          <MdDelete size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}

              {/* Draft row normal view */}
              {draft && editingIndex === "new" && (
                <tr>
                  <td className="px-4 py-2 text-sm">
                    {draft.documentType}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {draft.documentNumber || "-"}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    {draft.file ? draft.file.name : "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => setEditingIndex("new-edit")}
                      className="text-blue-500"
                    >
                      <FaPencilAlt />
                    </button>
                  </td>
                </tr>
              )}

              {/* Draft editable */}
              {editingIndex === "new-edit" && draft && (
                <EditableRow
                  draft={draft}
                  setDraft={setDraft}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  fileRef={fileRef}
                  handleFileChange={handleFileChange}
                />
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/* ================= EDITABLE ROW ================= */

const EditableRow = ({
  draft,
  setDraft,
  onSave,
  onCancel,
  fileRef,
  handleFileChange,
}) => {
  return (
    <tr className="bg-blue-50/30">
      <td className="p-2">
        <select
          className="w-full border px-2 py-1 text-sm rounded"
          value={draft?.documentType || ""}
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              documentType: e.target.value,
            }))
          }
        >
          {documentTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </td>

      <td className="p-2">
        <input
          className="w-full px-2 py-1.5 text-sm border rounded"
          value={draft.documentNumber}
          placeholder="Document No"
          onChange={(e) =>
            setDraft((prev) => ({
              ...prev,
              documentNumber: e.target.value,
            }))
          }
        />
      </td>

      <td className="p-2 text-left">
        <input
          type="file"
          ref={fileRef}
          accept=".jpg,.jpeg,.pdf"
          onChange={handleFileChange}
          className="hidden"
        />

        {draft.file ? (
          <span className="text-sm text-blue-600 ms-4">
            {draft.file.name}
          </span>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="text-blue-500 ms-4"
          >
            <FaFileAlt size={18} />
          </button>
        )}
      </td>

      <td className="p-2 text-center">
        <div className="flex gap-4 justify-center">
          <button onClick={onSave} className="text-green-600">
            <FaCheck size={16} />
          </button>
          <button onClick={onCancel} className="text-orange-500">
            <FaTimes size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default DocumentTab;