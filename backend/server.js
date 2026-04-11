const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from parent directory (the website)
app.use(express.static(path.join(__dirname, '..')));

// Store submissions (in-memory for now, could use a file or database)
let submissions = [];

// Create email transporter
// Using Gmail SMTP - you'll need to set up an App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'vozicomsystems@gmail.com',
    pass: process.env.EMAIL_PASS // App Password from Google Account
  }
});

// Beta registration endpoint
app.post('/api/beta-register', async (req, res) => {
  try {
    const { fullname, email, company, role, usecase, newsletter, terms } = req.body;

    // Validate required fields
    if (!fullname || !email || !terms) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please fill in all required fields' 
      });
    }

    // Create submission object
    const submission = {
      id: Date.now(),
      fullname,
      email,
      company: company || 'Not provided',
      role: role || 'Not specified',
      usecase: usecase || 'Not provided',
      newsletter: newsletter === 'on' || newsletter === true,
      terms: terms === 'on' || terms === true,
      submittedAt: new Date().toISOString()
    };

    // Store submission
    submissions.push(submission);

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER || 'vozicomsystems@gmail.com',
      to: 'vozicomsystems@gmail.com',
      subject: `New Beta Registration: ${fullname}`,
      html: `
        <h2>New Beta Program Registration</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Full Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${fullname}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Company</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${submission.company}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Role</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${submission.role}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Use Case</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${submission.usecase}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Newsletter</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${submission.newsletter ? 'Yes' : 'No'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Submitted At</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${submission.submittedAt}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
          Total submissions: ${submissions.length}
        </p>
      `
    };

    await transporter.sendMail(mailOptions);

    // Send confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER || 'vozicomsystems@gmail.com',
      to: email,
      subject: 'Welcome to the LoOper Beta Program!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6d5bd0;">Welcome to LoOper Beta, ${fullname}!</h2>
          <p>Thank you for applying to the LoOper Beta Program. We've received your application and are reviewing it.</p>
          <p>Here's what happens next:</p>
          <ul>
            <li>We'll review your application within 2-3 business days</li>
            <li>If approved, you'll receive beta access credentials via email</li>
            <li>You'll get access to exclusive beta resources and direct support</li>
          </ul>
          <p>If you have any questions, reply to this email.</p>
          <p style="margin-top: 30px; color: #666;">
            Best regards,<br>
            The LoOper Team
          </p>
        </div>
      `
    };

    await transporter.sendMail(userMailOptions);

    console.log(`Beta registration received from ${email}`);
    
    res.json({ 
      success: true, 
      message: 'Registration successful! Check your email for confirmation.' 
    });

  } catch (error) {
    console.error('Error processing registration:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error. Please try again later.' 
    });
  }
});

// Get all submissions (for admin use)
app.get('/api/submissions', (req, res) => {
  res.json(submissions);
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           LoOper Beta Backend Server                   ║
╠════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}              ║
║  Beta form: http://localhost:${PORT}/beta.html            ║
║  Total submissions: ${submissions.length}                                  ║
╚════════════════════════════════════════════════════════╝
  `);
});
