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

// Store submissions (in-memory for now, could use a file or a database)
let submissions = [];
let contactSubmissions = [];
let purchaseRequests = [];

// Activation key and download URL for purchase confirmations
const ACTIVATION_KEY = 'ARW-MV4UU-MLDGJ-LHSSL-KN5UV-C22WK-VIVGS-LTJFW-WY6TD-GNLGY-SLKN5-UU22S-BPFHG-SMDXJ-ZJTA6-CNPFE-XGSLN-NAZVQ-MTYOB-RFO3B-QJFVG-66DGK-E6T27-BSMJL-GCWKI-NJCHA-6THPB-QUUMS-ZJRHW-IYJVO-FUHSQ-SOLFW-GGYZL-OZ2TC-32TGB-3EESB-LM5CT-2';
const DOWNLOAD_URL = 'https://drive.google.com/file/d/1ocZK1GrF-eI10XuouNQwQKyQBkm-DcZs/view?usp=sharing';

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
      subject: 'Welcome to the Arrow Beta Program!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">Welcome to Arrow Beta, ${fullname}!</h2>
          <p>Thank you for applying to the Arrow Beta Program. We've received your application and are reviewing it.</p>
          <p>Here's what happens next:</p>
          <ul>
            <li>We'll review your application within 2-3 business days</li>
            <li>If approved, you'll receive beta access credentials via email</li>
            <li>You'll get access to exclusive beta resources and direct support</li>
          </ul>
          <p>If you have any questions, reply to this email.</p>
          <p style="margin-top: 30px; color: #666;">
            Best regards,<br>
            The Arrow Team
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

// Contact form endpoint
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, inquiryType, company, version, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !inquiryType || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Create submission object
    const submission = {
      id: Date.now(),
      type: 'contact',
      name,
      email,
      inquiryType,
      company: company || 'Not provided',
      version: version || 'Not provided',
      subject,
      message,
      submittedAt: new Date().toISOString()
    };

    // Store submission
    contactSubmissions.push(submission);

    // Inquiry type labels
    const inquiryLabels = {
      'partners': 'Partnership Opportunity',
      'bug': 'Bug Report',
      'feature': 'Feature Request',
      'general': 'General Inquiry'
    };

    // Send email notification to admin
    const mailOptions = {
      from: process.env.EMAIL_USER || 'vozicomsystems@gmail.com',
      to: 'vozicomsystems@gmail.com',
      subject: `[Arrow Contact] ${inquiryLabels[inquiryType]}: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Inquiry Type</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${inquiryLabels[inquiryType]}</td>
          </tr>
          ${company !== 'Not provided' ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Company</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${company}</td>
          </tr>
          ` : ''}
          ${version !== 'Not provided' ? `
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Version</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${version}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Subject</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${subject}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; vertical-align: top;">Message</td>
            <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${message}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Submitted At</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${submission.submittedAt}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
          Total contact submissions: ${contactSubmissions.length}
        </p>
      `
    };

    await transporter.sendMail(mailOptions);

    // Send confirmation email to user
    const userMailOptions = {
      from: process.env.EMAIL_USER || 'vozicomsystems@gmail.com',
      to: email,
      subject: 'We received your message - Arrow',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">Thank you for contacting us, ${name}!</h2>
          <p>We've received your ${inquiryLabels[inquiryType].toLowerCase()} and will get back to you as soon as possible.</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <p style="margin-top: 20px;">Our team typically responds within 24-48 hours during business days.</p>
          <p style="margin-top: 30px; color: #666;">
            Best regards,<br>
            The Arrow Team
          </p>
        </div>
      `
    };

    await transporter.sendMail(userMailOptions);

    console.log(`Contact form submitted by ${email} - Type: ${inquiryType}`);

    res.json({
      success: true,
      message: 'Message sent successfully! We will get back to you soon.'
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Purchase request endpoint
app.post('/api/purchase', async (req, res) => {
  try {
    const { name, email, company, plan, devices, billing, totalPrice, message } = req.body;

    // Validate required fields
    if (!name || !email || !plan) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }

    // Create purchase request object
    const request = {
      id: Date.now(),
      type: 'purchase',
      name,
      email,
      company: company || 'Not provided',
      plan,
      devices: devices || 1,
      billing: billing || 'onetime',
      totalPrice: totalPrice || 0,
      message: message || '',
      status: 'pending',
      submittedAt: new Date().toISOString()
    };

    // Store request
    purchaseRequests.push(request);

    // Plan labels
    const planLabels = {
      'individual': 'Individual License ($100)',
      'corporate': 'Corporate License',
      'subscription': 'Monthly Subscription ($2/device)'
    };

    // Send email notification to admin
    const mailOptions = {
      from: process.env.EMAIL_USER || 'vozicomsystems@gmail.com',
      to: 'vozicomsystems@gmail.com',
      subject: `[Arrow Purchase] New ${planLabels[plan]} Request from ${name}`,
      html: `
        <h2>New Purchase Request</h2>
        <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${email}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Company</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${request.company}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Plan</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${planLabels[plan]}</td>
          </tr>
          ${plan === 'corporate' || plan === 'subscription' ? `
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Devices</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${devices}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Billing</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${billing === 'monthly' ? 'Monthly' : 'One-time'}</td>
          </tr>
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Total Price</td>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #0891b2;">$${totalPrice}</td>
          </tr>
          ${message ? `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; vertical-align: top;">Message</td>
            <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap;">${message}</td>
          </tr>
          ` : ''}
          <tr style="background-color: #f5f5f5;">
            <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Submitted At</td>
            <td style="padding: 10px; border: 1px solid #ddd;">${request.submittedAt}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
          Total purchase requests: ${purchaseRequests.length} | Pending: ${purchaseRequests.filter(r => r.status === 'pending').length}
        </p>
        <p style="margin-top: 10px; color: #333; font-weight: bold;">
          ACTION REQUIRED: Verify this purchase and contact the customer within a few minutes with download/payment instructions.
        </p>
      `
    };

    await transporter.sendMail(mailOptions);

    // Send confirmation email to user with download link and activation key
    const userMailOptions = {
      from: process.env.EMAIL_USER || 'vozicomsystems@gmail.com',
      to: email,
      subject: 'Your Arrow Purchase - Download & Activation Key',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">Thank you for your purchase, ${name}!</h2>
          <p>Your order for <strong>${planLabels[plan]}</strong> has been confirmed.</p>
          
          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #333;">Order Summary:</h3>
            <p><strong>Plan:</strong> ${planLabels[plan]}</p>
            ${plan === 'corporate' || plan === 'subscription' ? `<p><strong>Devices:</strong> ${devices}</p>` : ''}
            <p><strong>Total:</strong> $${totalPrice}</p>
          </div>

          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #4CAF50;">
            <h3 style="margin-top: 0; color: #2e7d32;">Download Arrow</h3>
            <p>Download your copy of Arrow here:</p>
            <p style="text-align: center; margin: 16px 0;">
              <a href="${DOWNLOAD_URL}" style="display: inline-block; background: #0891b2; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                Download Arrow
              </a>
            </p>
            <p style="font-size: 0.85rem; color: #666;">
              Or copy this link: <a href="${DOWNLOAD_URL}" style="color: #0891b2;">${DOWNLOAD_URL}</a>
            </p>
          </div>

          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #FF9800;">
            <h3 style="margin-top: 0; color: #e65100;">Your Activation Key</h3>
            <p>Use the following key to activate your license:</p>
            <div style="background: white; padding: 16px; border-radius: 6px; border: 1px dashed #FF9800; font-family: 'Courier New', monospace; font-size: 13px; word-break: break-all; line-height: 1.6; color: #333; margin: 12px 0; user-select: all;">
              ${ACTIVATION_KEY}
            </div>
            <p style="font-size: 0.85rem; color: #666;">Copy this key and paste it into the activation dialog when prompted.</p>
          </div>

          <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #333;">Installation Instructions:</h4>
            <ol style="line-height: 1.8; padding-left: 20px;">
              <li>Download Arrow using the button above</li>
              <li>Run the installer and follow the setup wizard</li>
              <li>Launch Arrow and enter your activation key when prompted</li>
              <li>Start automating with deterministic, edge-ready AI!</li>
            </ol>
          </div>

          <p>If you have any questions or issues with activation, simply reply to this email and our support team will help you.</p>

          <p style="margin-top: 30px; color: #666;">
            Best regards,<br>
            The Arrow Team
          </p>
        </div>
      `
    };

    await transporter.sendMail(userMailOptions);

    console.log(`Purchase request from ${email} - Plan: ${plan}, Total: $${totalPrice}`);

    res.json({
      success: true,
      message: 'Purchase request submitted! Check your email for next steps.'
    });

  } catch (error) {
    console.error('Error processing purchase request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again later.'
    });
  }
});

// Get all submissions (for admin use)
app.get('/api/submissions', (req, res) => {
  res.json({
    beta: submissions,
    contact: contactSubmissions,
    purchases: purchaseRequests
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║           Arrow Backend Server                   ║
╠════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}              ║
║  Contact form: http://localhost:${PORT}/contact.html            ║
║  Total submissions: ${submissions.length}                                  ║
╚════════════════════════════════════════════════════════╝
  `);
});
