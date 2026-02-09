const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: "smtp.hostinger.in",
  port: 465,
  secure: true, 
  auth: {
    user: process.env.MAILNAME,
    pass: process.env.MAILPASS,
  },
  
  tls: {
    rejectUnauthorized: false 
  }
});

// Function to send email
const sendEmail = async (to, subject, templateName, templateData) => {

  console.log("to",to);
  console.log("subject",subject)
  try {
    const templatePath = path.join(__dirname, "../email_templates", `${templateName}.html`);
    let html = fs.readFileSync(templatePath, "utf8");
    for (const key in templateData) {
      html = html.replace(new RegExp(`{{${key}}}`, "g"), templateData[key]);
    }

    await transporter.sendMail({
      from: `"I-Diligence Solution" <${process.env.MAILNAME}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent to ${to} with subject: ${subject}`);
  } catch (err) {
    console.error("Error sending email:", err);
  }
};


module.exports = sendEmail;
