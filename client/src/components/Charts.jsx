import React from 'react';
// chartSetup.js or inside chart file
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
  } from "chart.js";
  
  ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    ArcElement,
    Tooltip,
    Legend
  );
  

const Charts = () => {
  return (
    <div>Charts</div>
  )
}



export default Charts