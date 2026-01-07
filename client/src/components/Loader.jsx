import React from 'react'

const Loader = () => {
  return (
    <div class="relative w-12 h-12 animate-spin988">
  <div class="absolute top-0 left-0 w-5 h-5 bg-[#222f7d] rounded-full"></div>
  <div class="absolute top-0 right-0 w-5 h-5 bg-[#222f7d] rounded-full"></div>
  <div class="absolute bottom-0 left-0 w-5 h-5 bg-[#222f7d] rounded-full"></div>
  <div class="absolute bottom-0 right-0 w-5 h-5 bg-[#222f7d] rounded-full"></div>
</div>

  )
}

export default Loader