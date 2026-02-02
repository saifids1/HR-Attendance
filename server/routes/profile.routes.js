
const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const auth = require("../middlewares/authMiddleware");
const { db } = require("../db/connectDB");
const { getOrganizationInfo, addOrganizationInfo, updateOrganizationInfo, addPersonInfo, addEducationInfo, getEducationInfo, getPersonalInfo, updatePersonalInfo, updateEducationInfo, deleteEducationInfo, addExperienceInfo, updateExperienceInfo, deleteExperienceInfo, getExperienceInfo, getContactInfo, updateContactInfo, addBankInfo, getBankInfo, updateBankInfo, addBankDocInfo, getAllBankDoc, addProfileImage, getProfileImage } = require("../controllers/profile.controller");
const { isAdmin } = require("../middlewares/roleMiddleware");
const uploadBankDoc = require("../middlewares/uploadBankDoc");
const uploadProfileImage = require("../middlewares/uploadProfileImage");

const router = express.Router();

// Organization
router.post("/organization", auth, addOrganizationInfo);


router.get("/organization", auth, getOrganizationInfo)

//  Only Admin Can Update Organization

router.put("/organization", auth, isAdmin, updateOrganizationInfo)

// Personal
// ---------- DOB PARSER ----------


// ---------- POST PERSONAL DETAILS ----------
router.post("/personal/:emp_id", auth, addPersonInfo);

router.get("/personal/:emp_id", auth, getPersonalInfo);

router.put("/personal/:emp_id", auth, updatePersonalInfo);




// Education -
// POST Request
router.post("/education/:emp_id", auth, addEducationInfo);


// GET Request
router.get("/education/:emp_id", auth, getEducationInfo);

// PUT Request 
router.put("/education/:emp_id/:id", auth, updateEducationInfo);

// DELETE Request 
router.delete("/education/:emp_id/:id", auth, deleteEducationInfo);


// Experience

// CREATE
router.post("/experience/:emp_id", auth, addExperienceInfo);

// UPDATE
router.put("/experience/:emp_id/:id", auth, updateExperienceInfo);


router.delete("/experience/:emp_id/:id", auth, deleteExperienceInfo);


// Get 
router.get("/experience/:emp_id", auth, getExperienceInfo);


// Contact API 


// GET Request
router.get("/contact/:emp_id", auth, getContactInfo);


// PUT Request
// Update all contacts for an employee
router.put("/contact/:emp_id", auth, updateContactInfo);

// BANK API

router.post("/bank/:emp_id", auth, addBankInfo);

router.get("/bank/:emp_id", auth, getBankInfo);


router.put("/bank/:emp_id", auth, updateBankInfo);


// Document Upload Api 

router.post(
  "/bank/doc/:emp_id",
  auth,
  (req, res, next) => {
    uploadBankDoc(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: err.message });
      }
      next();
    });
  },
  addBankDocInfo
);


// GET all bank documents for an employee
router.get("/bank/doc/:emp_id", auth, getAllBankDoc);



// Profile Image


router.post(
  "/image/",
  auth,
  uploadProfileImage.single("profile"),
  addProfileImage
);

// GET /api/employee/profile/image
router.get("/image", auth, getProfileImage);


module.exports = router;
