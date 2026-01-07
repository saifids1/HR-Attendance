import React from 'react'

const FormCard = ({ title, children }) => (
    <div className="border rounded-lg p-4 bg-gray-50">
      <h4 className="font-semibold text-[#222F7D] mb-4">{title}</h4>
     
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </div>
    </div>
  );


export default FormCard;