const express = require('express');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { db } = require("../db/connectDB");
const { registerController, loginController } = require('../controllers/user.controllers');
require("dotenv").config();

const router = express.Router();


// Register Routes

router.post("/register", registerController);
  
// Login Routes

router.post("/login", loginController);
  



module.exports = router;