import { Button, Typography } from '@mui/material'
import React from 'react';


const ChangePassword = () => {

   

  return (
    <>
     <div className="px-3 pb-6">
    
        {/* Sticky Header */}
        <div className="sticky top-0 z-50 bg-[#222F7D] rounded-lg">
          <Typography className="text-white py-2 text-2xl text-center">
           Change-Password
          </Typography>
        </div>
    
    
       
      
    <form className="w-full max-w-lg mx-auto p-5">
  <div className="flex flex-wrap -mx-3 mb-6">
  
  </div>
  <div className="flex flex-wrap -mx-3 mb-6">
    <div className="w-full px-3">
      <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="Emp-id">
         Emp Id
      </label>
      <input className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500" id="Emp-id" type="text" placeholder="Enter Employee Id ...."/>
      {/* <p className="text-gray-600 text-xs italic">Make it as long and as crazy as you'd like</p> */}
    </div>

    <div className="w-full px-3">
      <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="new-password">
         New Password
      </label>
      <input className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500" id="new-password" type="password" placeholder="******************"/>
      {/* <p className="text-gray-600 text-xs italic">Make it as long and as crazy as you'd like</p> */}
    </div>

    <div className="w-full px-3">
      <label className="block uppercase tracking-wide text-gray-700 text-xs font-bold mb-2" htmlFor="confirm-password">
         Confirm Password
      </label>
      <input className="appearance-none block w-full bg-gray-200 text-gray-700 border border-gray-200 rounded py-3 px-4 mb-3 leading-tight focus:outline-none focus:bg-white focus:border-gray-500" id="confirm-password" type="password" placeholder="******************"/>
      {/* <p className="text-gray-600 text-xs italic">Make it as long and as crazy as you'd like</p> */}
    </div>
  </div>
  <Button variant='contained'  >Reset Password</Button>
</form>
      </div>
    </>
  )
}

export default ChangePassword