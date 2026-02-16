import React from 'react'

const FormCard = ({ title, children }) => (
  <div className="border rounded-lg p-4 bg-white w-full"> 
    {/* Removed bg-red-500 for visibility, kept w-full */}
    <h4 className="font-semibold text-[#222F7D] mb-4">{title}</h4>
    <div className="w-full">
      {children}
    </div>
  </div>
);

export default FormCard