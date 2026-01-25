import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev"; // Default Resend test email

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  // If Resend is not configured, log in development mode
  if (!resend || !process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured. Email not sent.");
    return;
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error("❌ Resend API Error:", error);
      if (process.env.NODE_ENV === "development") {
        console.error("Error details:", JSON.stringify(error, null, 2));
        console.error("Error message:", error.message);
      }
      throw new Error(`Failed to send email: ${error.message || JSON.stringify(error)}`);
    }

    if (!data || !data.id) {
      console.error("❌ Resend API returned no email ID");
      console.error("Response data:", JSON.stringify(data, null, 2));
      throw new Error("Failed to send email: No email ID returned from Resend");
    }

    if (process.env.NODE_ENV === "development") {
      console.log("✅ Email sent successfully to:", options.to);
      console.log("📧 Email ID:", data.id);
      console.log("📬 From:", fromEmail);
      console.log("📬 To:", options.to);
      console.log("💡 View in Resend Dashboard: https://resend.com/emails");
    }
  } catch (error) {
    console.error("Failed to send email:", error);
    if (process.env.NODE_ENV === "development") {
      console.error("Error details:", JSON.stringify(error, null, 2));
    }
    throw error;
  }
}

export async function sendResetPasswordEmail(email: string, name: string, resetToken: string): Promise<string> {
  const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to Thai Chinese Tour!</h1>
          <p>Hello ${name},</p>
          <p>Your account has been created. Please set your password by clicking the link below:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Set Your Password
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This link will expire in 24 hours. If you didn't request this, please ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Welcome to Thai Chinese Tour!
    
    Hello ${name},
    
    Your account has been created. Please set your password by visiting this link:
    ${resetUrl}
    
    This link will expire in 24 hours. If you didn't request this, please ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: "Set Your Password - Thai Chinese Tour",
    html,
    text,
  });

  // In development mode, also log the reset URL for easy testing
  if (process.env.NODE_ENV === "development") {
    console.log("\n" + "=".repeat(70));
    console.log("🔗 RESET PASSWORD LINK (Development Mode)");
    console.log("=".repeat(70));
    console.log(`User: ${name} (${email})`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log("=".repeat(70) + "\n");
  }

  // Return reset URL for development/testing purposes
  return resetUrl;
}

export async function sendForgotPasswordEmail(email: string, name: string, resetToken: string): Promise<string> {
  const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/reset-password/${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Reset Your Password</h1>
          <p>Hello ${name},</p>
          <p>We received a request to reset your password. Click the link below to create a new password:</p>
          <p style="margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This link will expire in 24 hours. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Reset Your Password
    
    Hello ${name},
    
    We received a request to reset your password. Please visit this link to create a new password:
    ${resetUrl}
    
    This link will expire in 24 hours. If you didn't request a password reset, please ignore this email and your password will remain unchanged.
  `;

  await sendEmail({
    to: email,
    subject: "Reset Your Password - Thai Chinese Tour",
    html,
    text,
  });

  // In development mode, also log the reset URL for easy testing
  if (process.env.NODE_ENV === "development") {
    console.log("\n" + "=".repeat(70));
    console.log("🔗 FORGOT PASSWORD LINK (Development Mode)");
    console.log("=".repeat(70));
    console.log(`User: ${name} (${email})`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log("=".repeat(70) + "\n");
  }

  // Return reset URL for development/testing purposes
  return resetUrl;
}

export async function sendEmailVerificationEmail(
  email: string,
  name: string,
  resetToken: string,
  newEmail: string,
): Promise<string> {
  const verifyUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/verify-email/${resetToken}?email=${encodeURIComponent(newEmail)}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Verify Your New Email Address</h1>
          <p>Hello ${name},</p>
          <p>You have requested to change your email address to <strong>${newEmail}</strong>.</p>
          <p>Please verify your new email address by clicking the link below:</p>
          <p style="margin: 30px 0;">
            <a href="${verifyUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verifyUrl}</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This link will expire in 24 hours. If you didn't request this change, please ignore this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Verify Your New Email Address
    
    Hello ${name},
    
    You have requested to change your email address to ${newEmail}.
    
    Please verify your new email address by visiting this link:
    ${verifyUrl}
    
    This link will expire in 24 hours. If you didn't request this change, please ignore this email.
  `;

  await sendEmail({
    to: newEmail,
    subject: "Verify Your New Email Address - Thai Chinese Tour",
    html,
    text,
  });

  // In development mode, also log the verification URL for easy testing
  if (process.env.NODE_ENV === "development") {
    console.log("\n" + "=".repeat(70));
    console.log("🔗 EMAIL VERIFICATION LINK (Development Mode)");
    console.log("=".repeat(70));
    console.log(`User: ${name} (${email})`);
    console.log(`New Email: ${newEmail}`);
    console.log(`Verification URL: ${verifyUrl}`);
    console.log(`Token: ${resetToken}`);
    console.log("=".repeat(70) + "\n");
  }

  // Return verification URL for development/testing purposes
  return verifyUrl;
}

export async function sendEmailChangeNotificationEmail(
  oldEmail: string,
  newEmail: string,
  name: string,
  changedBy: string,
): Promise<void> {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Email Address Changed</h1>
          <p>Hello ${name},</p>
          <p>Your email address has been changed by an administrator (${changedBy}).</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Old Email:</strong> ${oldEmail}</p>
            <p style="margin: 10px 0 0 0;"><strong>New Email:</strong> ${newEmail}</p>
          </div>
          <p>If you did not request this change, please contact your administrator immediately.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Email Address Changed
    
    Hello ${name},
    
    Your email address has been changed by an administrator (${changedBy}).
    
    Old Email: ${oldEmail}
    New Email: ${newEmail}
    
    If you did not request this change, please contact your administrator immediately.
    
    This is an automated notification. Please do not reply to this email.
  `;

  await sendEmail({
    to: oldEmail,
    subject: "Your Email Address Has Been Changed",
    html,
    text,
  });

  // Also send notification to new email
  const newEmailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Email Address Changed</h1>
          <p>Hello ${name},</p>
          <p>Your email address has been changed by an administrator (${changedBy}).</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Old Email:</strong> ${oldEmail}</p>
            <p style="margin: 10px 0 0 0;"><strong>New Email:</strong> ${newEmail}</p>
          </div>
          <p>You can now use this email address (${newEmail}) to log in to your account.</p>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated notification. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  const newEmailText = `
    Email Address Changed
    
    Hello ${name},
    
    Your email address has been changed by an administrator (${changedBy}).
    
    Old Email: ${oldEmail}
    New Email: ${newEmail}
    
    You can now use this email address (${newEmail}) to log in to your account.
    
    This is an automated notification. Please do not reply to this email.
  `;

  await sendEmail({
    to: newEmail,
    subject: "Your Email Address Has Been Changed",
    html: newEmailHtml,
    text: newEmailText,
  });
}
