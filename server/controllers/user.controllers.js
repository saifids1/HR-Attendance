const jwt = require("jsonwebtoken");

const bcrypt = require("bcrypt");
const { db } = require("../db/connectDB");


const registerController = async (req, res) => {
  try {
    let { name, email, password, role, device_user_id } = req.body;

    //  Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    //  Normalize
    email = email.toLowerCase().trim();
    password = String(password); //  FIX
    role = role || "employee";   //  DEFAULT ROLE

    //  Check existing user
    const userExist = await db.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: "User already exists" });
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    //  Insert user
    const newUser = await db.query(
      `
      INSERT INTO users (name, email, password, role, device_user_id)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id, name, email, role
      `,
      [name, email, hashedPassword, role, device_user_id || null]
    );

    res.status(201).json({
      message: "User Registered Successfully",
      user: newUser.rows[0],
    });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

  


const loginController = async (req, res) => {
  try {
    let { email, password } = req.body;

    
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    
    email = email.trim().toLowerCase();
    password = String(password).trim();

  
    const result = await db.query(
      `SELECT id, name, email, password, role, emp_id 
       FROM users 
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = result.rows[0];

    
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        emp_id: user.emp_id
      },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

  
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emp_id: user.emp_id
      }
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


module.exports = { registerController, loginController };