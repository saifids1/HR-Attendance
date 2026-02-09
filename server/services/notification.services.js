const sendEmail = require("../utils/mailer");
const {db} = require("../db/connectDB");

const sendNotification = async (emp_id, section = "Profile", fallbackName = "Employee") => {
    try {
      // 1. Fetch user details
      const userResult = await db.query(
        `SELECT email, name, emp_id FROM users WHERE emp_id = $1`,
        [emp_id]
      );
  
      if (userResult.rows.length > 0) {
        const { email, name, emp_id: userEmpId } = userResult.rows[0];
  
        await sendEmail(email, `Profile Updated - ${section}`, "profile_update", {
          name: name || fallbackName,
          emp_id: userEmpId,
          email: email,
          section: section 
        });
  
        console.log(`Email sent for ${section} update to: ${email}`);
        return { success: true, email };
      } else {
        console.warn(`Email skip: No user found for emp_id: ${emp_id}`);
        return { success: false, reason: "User not found" };
      }
    } catch (error) {
      console.error("Error in profile update email service:", error);
      return { success: false, error };
    }
  };
module.exports = sendNotification